/**
 * 公式サイト（`/`）の共通情報。metadata / sitemap / robots / 構造化データで
 * 同じ値を使い回すためにここへ集める。
 */

/**
 * 公開URL。canonical と OG画像の絶対URL化に使う。
 *
 * `VERCEL_URL` はデプロイごとに変わるハッシュ付きURLなので使わない
 * （canonical がプレビュー用ドメインを指してしまう）。本番ドメインが入る
 * `VERCEL_PROJECT_PRODUCTION_URL` を使い、独自ドメインは
 * NEXT_PUBLIC_SITE_URL で明示的に上書きしてもらう。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "ラボカレ";

/**
 * 運営者の表記と連絡先。
 *
 * 利用規約・プライバシーポリシー・フッター・設定画面が同じ値を参照する。
 * 連絡先が変わったときに直すのはここ1箇所だけで済むようにしている
 * （文書の中に直接書くと、必ずどこかが古いまま残る）。
 */
export const OPERATOR_NAME = "ラボカレ運営";
export const CONTACT_EMAIL = "iwase.workslab@gmail.com";

/** 法務関連ページのパス。リンクを張る側はこれを使う */
export const TERMS_PATH = "/terms";
export const PRIVACY_PATH = "/privacy";

export const SITE_TITLE =
  "ラボカレ｜卒業研究のスケジュール管理アプリ（実験の予定・進捗共有）";

export const SITE_DESCRIPTION =
  "卒業研究のスケジュール管理に特化したカレンダー。実験テンプレートからの一括登録、ToDo、継代培養の記録、そして教授や先輩への進捗共有まで。";

/**
 * sitemap の lastModified。ビルドのたびに `new Date()` で更新すると
 * 「毎回変わるサイト」と見なされて信用されないので、内容を実際に更新した
 * ときだけ手で書き換える。
 */
export const SITE_LAST_MODIFIED = new Date("2026-08-04");

/** 検索エンジンに見せない（ログインが要る）パス */
export const PRIVATE_PATHS = [
  "/app",
  "/teacher",
  "/profile",
  "/shared",
  "/lab",
  "/culture",
  "/archive",
  "/auth",
  "/login",
  "/reset-password",
];

/** よくある質問。画面にも出し、同じ内容を FAQPage の構造化データにも使う */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "無料で使えますか？",
    a: "はい。現在すべての機能を無料でお使いいただけます。登録しなくてもデモデータ入りのカレンダーをその場で試せます。",
  },
  {
    q: "普通のカレンダーアプリと何が違いますか？",
    a: "実験のステップをテンプレートとして登録しておき、開始日を決めるだけで一連の予定をまとめて配置できます。培養や反応の待ち時間、共通装置の予約も考慮して並べられるため、実験の進み方に合った予定表になります。",
  },
  {
    q: "教授や先輩に進捗を見せられますか？",
    a: "カレンダー全体、または特定の実験だけを指定して共有できます。相手は閲覧とコメントのみで、予定を書き換えられることはありません。",
  },
  {
    q: "研究室のメンバーをまとめて管理できますか？",
    a: "研究室を作ると参加コードが発行されます。学生がコードで参加すると、主宰・スタッフは各メンバーのカレンダーを一覧から開いて確認できます。学生側はいつでも公開を停止できます。",
  },
  {
    q: "生物系以外でも使えますか？",
    a: "使えます。継代培養の記録など分野ごとのツールはマイページの「実験モード」からON / OFFを切り替えられるので、必要な機能だけを表示できます。",
  },
  {
    q: "スマートフォンでも使えますか？",
    a: "使えます。ブラウザから同じURLでアクセスでき、画面幅に合わせて表示が切り替わります。アプリのインストールは不要です。",
  },
];
