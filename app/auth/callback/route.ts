import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// OAuth / メール確認のコールバック。code をセッションに交換する。
// セッションcookieは「返すリダイレクトレスポンス」に直接書き込む（初回ログインで
// cookieが乗らずログイン画面へ戻される不具合を防ぐ）。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Vercel のプロキシ配下でも正しい公開ホストへ戻す
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NODE_ENV === "development"
      ? origin
      : forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : origin;

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth`);
  }

  // 先にリダイレクト先レスポンスを作り、そこへ cookie を書き込む
  const response = NextResponse.redirect(`${base}${next}`);

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${base}/login?error=auth`);
  }
  return response;
}
