/**
 * ログイン後の行き先（next）の取り扱い。
 *
 * `/` は公式サイトになったため、認証から戻ってきた人を素通しで `/` に置くと
 * 「ログインしたのにアプリに入れない」状態になる。行き先を URL で運ぶ必要がある。
 *
 * ただし外から与えられた値をそのままリダイレクト先にするとオープンリダイレクトに
 * なるので、必ずここを通して自サイト内の絶対パスだけに絞る。
 * DOM にも DB にも依存しない純粋関数なのでテストで固める。
 */

/** 学生用カレンダー。行き先が決められないときの既定 */
export const DEFAULT_AFTER_LOGIN = "/app";

/** 教授用の管理画面 */
export const TEACHER_HOME = "/teacher";

/** 認証プロバイダから戻ってくるパス */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** パスワードの再設定ページ。再設定メールのリンクから最終的にここへ着地させる */
export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * OAuth から戻ってくる先。**クエリを一切付けない**のが要点。
 *
 * Supabase は `redirect_to` を「Redirect URLs 許可リスト」と照合し、
 * 一致しなければ**黙って Site URL（＝このアプリでは公式サイト `/`）へ戻す**。
 * そして許可リストは既定でクエリ文字列を考慮するため、`?next=/app` のような
 * クエリを付けると `https://例/auth/callback` という登録では一致しない
 * （通すには許可リスト側を `https://例/**` にする必要がある）。
 *
 * 実際にこれで「1回目のログインが公式サイトに落ちて未ログインのまま終わる」
 * 不具合が起きていた。行き先は cookie（NEXT_COOKIE）で運び、URL は常に
 * 1種類だけにして、素直な登録でも必ず一致するようにする。
 */
export function authCallbackUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${AUTH_CALLBACK_PATH}`;
}

/**
 * ログイン後の行き先を一時的に預ける cookie。
 *
 * OAuth の往復（自サイト → Google → Supabase → 自サイト）はすべて
 * トップレベルの GET 遷移なので、SameSite=Lax でも送られる。
 * 中身は利用者が書き換えられるため、読む側で必ず resolveNext() を通すこと。
 */
export const NEXT_COOKIE = "labocale.next";

/** cookie の既定の有効期間（秒）。ログインの往復に必要な分だけ持たせる */
export const NEXT_COOKIE_MAX_AGE = 600;

/**
 * メールの往復を挟む場合の有効期間（秒）。
 * パスワード再設定はメールを開くまでに間があるので長めにする。
 */
export const NEXT_COOKIE_MAX_AGE_EMAIL = 1800;

/**
 * `document.cookie` に代入する文字列を組み立てる。
 * DOM に触らない純粋関数にしてテストで固める。
 */
export function serializeNextCookie(
  dest: string,
  secure: boolean,
  maxAgeSeconds: number = NEXT_COOKIE_MAX_AGE,
): string {
  const base = [
    `${NEXT_COOKIE}=${encodeURIComponent(dest)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "SameSite=Lax",
  ];
  // http のローカル開発で Secure を付けるとブラウザに捨てられる
  if (secure) base.push("Secure");
  return base.join("; ");
}

/**
 * next パラメータを検証して安全な遷移先を返す。
 * - `/app` のような自サイト内の絶対パスだけを通す
 * - `//evil.com`（プロトコル相対）や `https://evil.com` は弾く
 * - 空・null・相対パスも弾く
 */
export function resolveNext(
  raw: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (!raw) return fallback;
  // 先頭が `/` でなければ外部 or 相対。`//` はプロトコル相対で外部へ飛べてしまう。
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // `/\evil.com` のようにバックスラッシュで騙せるブラウザがあるので合わせて弾く
  if (raw.startsWith("/\\")) return fallback;
  return raw;
}

/**
 * ログイン後に着地させたい場所を、今いるパスから決める。
 * 教授の入口(/teacher)から入った人を学生側へ流さないための判定。
 */
export function afterLoginFrom(pathname: string): string {
  if (pathname.startsWith(TEACHER_HOME)) return TEACHER_HOME;
  if (pathname.startsWith(DEFAULT_AFTER_LOGIN)) return DEFAULT_AFTER_LOGIN;
  return DEFAULT_AFTER_LOGIN;
}

/**
 * 利用形態に応じた「戻る」先。教授はカレンダーを持たないので管理画面へ。
 * 各ページの「カレンダーへ戻る」が一律 `/app` を指していると、教授は押すたびに
 * リダイレクトで弾き返される（かつ文言も嘘になる）ため、ここで一元化する。
 */
export function homeFor(isTeacher: boolean): string {
  return isTeacher ? TEACHER_HOME : DEFAULT_AFTER_LOGIN;
}

/**
 * 利用形態を踏まえた最終的な着地先。
 *
 * 教授はカレンダーを持たないので、行き先が学生用ホーム(/app)なら管理画面へ振り替える。
 * 一方 `/shared` や `/lab` のように明示的に指定された行き先はそのまま尊重する
 * （保護ページから弾かれて next を持って戻ってきた人を、勝手に別の場所へ送らない）。
 */
export function destForRole(dest: string, isTeacher: boolean): string {
  if (!isTeacher) return dest;
  const isStudentHome =
    dest === DEFAULT_AFTER_LOGIN || dest.startsWith(`${DEFAULT_AFTER_LOGIN}?`);
  return isStudentHome ? TEACHER_HOME : dest;
}
