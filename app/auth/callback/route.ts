import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  resolveNext,
  destForRole,
  DEFAULT_AFTER_LOGIN,
  NEXT_COOKIE,
} from "@/lib/authRedirect";
import { isTeacherServer } from "@/lib/supabase/serverFlags";

// OAuth / メール確認のコールバック。code をセッションに交換する。
// セッションcookieは「返すリダイレクトレスポンス」に直接書き込む（初回ログインで
// cookieが乗らずログイン画面へ戻される不具合を防ぐ）。
// 行き先は交換後に決まる（教授かどうかで変わる）ので、cookie はいったん配列へ
// 溜めておき、最後に組み立てたレスポンスへまとめて載せる。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 行き先の取得元は「URLのnext → cookie」の順。
  // 通常は cookie 側に入っている（戻り先URLにクエリを付けると Supabase の
  // 許可リストに一致せず、公式サイトへ飛ばされてしまうため）。
  // URL の next も見るのは、既に送信済みの確認メール内のリンクとの互換のため。
  //
  // cookie は利用者が書き換えられるので、どちらの経路でも必ず resolveNext() を
  // 通して自サイト内の絶対パスだけに絞る（オープンリダイレクト対策）。
  const rawNext =
    searchParams.get("next") ?? decodeCookie(request.cookies.get(NEXT_COOKIE)?.value);
  const next = rawNext ? resolveNext(rawNext) : null;

  // Vercel のプロキシ配下でも正しい公開ホストへ戻す
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NODE_ENV === "development"
      ? origin
      : forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : origin;

  // 失敗時は元々ログインしようとしていた場所へ戻す（`next` が無ければカレンダーへ。
  // `/` は公式サイトでモーダルが無いため使わない）。教授が /teacher から失敗した場合に
  // 学生用カレンダー側へ飛ばさないために、next をそのまま使う。
  const failure = `${base}${next ?? DEFAULT_AFTER_LOGIN}?login=1&error=auth`;

  if (!code) {
    return done(NextResponse.redirect(failure));
  }

  const pending: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          pending.push(...cookiesToSet);
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return done(NextResponse.redirect(failure));
  }

  // 行き先を決める。カレンダーのログインフォームからだと next=/app が必ず載るので、
  // 「next が無いときだけ役割を見る」形にすると教授が学生カレンダーへ着地してしまう。
  // 役割は常に見て、学生用ホーム宛のときだけ管理画面へ振り替える
  // （/shared などの明示的な行き先はそのまま尊重する）。
  const uid = data.session?.user?.id;
  const teacher = uid ? await isTeacherServer(supabase, uid) : false;
  const dest = destForRole(next ?? DEFAULT_AFTER_LOGIN, teacher);

  const response = NextResponse.redirect(`${base}${dest}`);
  pending.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return done(response);
}

/**
 * 行き先を預けていた cookie は使い捨て。成功でも失敗でも必ず消す
 * （残すと、次に別の場所からログインしたとき古い行き先へ飛ばされる）。
 */
function done(response: NextResponse): NextResponse {
  response.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

/**
 * cookie の値を安全に復元する。document.cookie へ入れるときに
 * encodeURIComponent しているが、壊れた値で例外を投げさせない。
 */
function decodeCookie(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}
