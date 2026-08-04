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
