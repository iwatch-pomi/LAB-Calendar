/**
 * ログイン・新規登録の受付を開けておくか。
 *
 * 「コードは残したまま、画面からは消しておきたい」ための切り替え。
 * 消すのではなくフラグで隠すので、再開するときはこのファイルを
 * 書き換えるだけで元に戻る（他のファイルは触らなくてよい）。
 *
 * false の間は、認証の入口を一切出さない：
 * ・画面の導線（サイドバー / ゲストバナー / 保存案内 / 公式サイトの教授向け入口）
 * ・/login や `?login=1` からのモーダル自動表示
 * ・/teacher のログイン画面
 * ・/auth/callback でのセッション交換（送信済みのメール内リンクも通さない）
 *
 * すでにログインしている端末のセッションはそのまま使える。意図的にそうしている。
 * ここで塞ぐのは「新しくログインすること」だけで、ログイン後の機能も、
 * ログアウトや退会も今までどおり動く。
 *
 * 再開するときは true に戻す。あわせて OAUTH_ENABLED も見ること。
 */
export const AUTH_ENABLED = false;

/**
 * ログイン画面に出す外部サービスのボタン。
 *
 * AUTH_ENABLED が true のときだけ意味を持つ。片方だけ戻すこともできる
 * （Supabase 側でプロバイダを有効にしてから true にすること）。
 */
export const OAUTH_ENABLED: Record<"google" | "apple", boolean> = {
  google: false,
  apple: false,
};

/** Google / Apple のボタンを1つでも出すか */
export const ANY_OAUTH_ENABLED = OAUTH_ENABLED.google || OAUTH_ENABLED.apple;

/** 受付を止めている間、入口だった場所に出す案内 */
export const AUTH_CLOSED_TITLE = "アカウントの受付を停止しています";
export const AUTH_CLOSED_BODY =
  "ただいま、新しいログイン・新規登録の受付を停止しています。カレンダーはこのままお試しいただけます（変更はこのブラウザにのみ保存されます）。";
