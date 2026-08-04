import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_AFTER_LOGIN } from "@/lib/authRedirect";

/**
 * 認証を見る必要がない公開パス。
 * `/`（公式サイト）と SEO 用のファイルはここで抜けて、Supabase への
 * ネットワーク往復（getUser）を挟まないようにする。検索エンジンが測るのは
 * この経路なので、認証のために遅くしない。
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  );
}

export async function updateSession(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // アカウント機能のページはログイン必須。
  // カレンダー(/app)は未ログインでも「ゲストモード」で閲覧・お試し編集できる。
  // /teacher は含めない: 未ログイン時は自分自身で独立したログイン画面を描画する
  // ため（app/teacher/page.tsx）、ここでリダイレクトすると学生用カレンダーの上に
  // 認証モーダルが重なって見える不具合になる。
  const isProtectedRoute =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/culture") ||
    pathname.startsWith("/archive") ||
    pathname.startsWith("/lab") ||
    pathname.startsWith("/shared");

  // 未ログインで保護ページ → 認証モーダルのあるカレンダーへ戻す。
  // 行き先(next)を必ず持たせる（そうしないと元々見ようとしていたページに戻れない）。
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AFTER_LOGIN;
    url.searchParams.set("login", "1");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ログイン済みでログインページ → カレンダーへ（ログインUIはモーダルに統合済み）
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AFTER_LOGIN;
    url.searchParams.delete("login");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
