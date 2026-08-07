import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_AFTER_LOGIN, AUTH_CALLBACK_PATH } from "@/lib/authRedirect";
import { TERMS_PATH, PRIVACY_PATH } from "@/lib/site";

/**
 * 認証を見る必要がない公開パス。
 * `/`（公式サイト）と SEO 用のファイルはここで抜けて、Supabase への
 * ネットワーク往復（getUser）を挟まないようにする。検索エンジンが測るのは
 * この経路なので、認証のために遅くしない。
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    // 規約・ポリシーは誰でも読める。認証を見る必要がないので素通しにする
    pathname === TERMS_PATH ||
    pathname === PRIVACY_PATH ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  );
}

/**
 * 認証の戻りが `/auth/callback` 以外に届いてしまったかを判定する。
 *
 * Supabase は `redirect_to` が Redirect URLs 許可リストに一致しないと、
 * 黙って Site URL（このアプリでは公式サイト `/`）へ戻す。公式サイトには
 * コードを交換する処理が無いので、そのままだと**未ログインのまま行き止まり**になる。
 * 拾って `/auth/callback` へ渡し直せば、設定がどうであれログインは完了する。
 *
 * 判定に使うのは `code` と `error_description` だけ。**素の `error` では判定しない**。
 * コールバックの失敗時に自分で作る `/app?login=1&error=auth` を拾ってしまい、
 * `/auth/callback`（code 無し）→ 失敗 → `/app?...error=auth` → … と無限ループする。
 * `code` / `error_description` はどちらも認証プロバイダ側しか付けない。
 */
function isStrayAuthCallback(request: NextRequest): boolean {
  if (request.nextUrl.pathname === AUTH_CALLBACK_PATH) return false;
  const sp = request.nextUrl.searchParams;
  return sp.has("code") || sp.has("error_description");
}

export async function updateSession(request: NextRequest) {
  // 公開パスの早期returnより前に置く（`/` に落ちてくるのがまさにこの症状のため）
  if (isStrayAuthCallback(request)) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_CALLBACK_PATH;
    // クエリ（code / next / error 系）はそのまま引き継がれる
    return NextResponse.redirect(url);
  }

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
