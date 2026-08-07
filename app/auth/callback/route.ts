import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  resolveNext,
  DEFAULT_AFTER_LOGIN,
  TEACHER_HOME,
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
  // 外部サイトへ飛ばされないよう必ず検証する。next が無い場合は
  // 下で役割（教授かどうか）を見てから決めるので、ここでは保留にする。
  const rawNext = searchParams.get("next");
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
    return NextResponse.redirect(failure);
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
    return NextResponse.redirect(failure);
  }

  // 行き先を決める。明示の next があればそれを優先し、無ければ役割で振り分ける。
  // 教授はカレンダーを使わないので、毎回カレンダーに着地させない。
  let dest = next;
  if (!dest) {
    dest = DEFAULT_AFTER_LOGIN;
    const uid = data.session?.user?.id;
    if (uid && (await isTeacherServer(supabase, uid))) dest = TEACHER_HOME;
  }

  const response = NextResponse.redirect(`${base}${dest}`);
  pending.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}
