/** @type {import('next').NextConfig} */

/**
 * 全ページに付けるセキュリティヘッダ。
 *
 * 研究データを扱うため、ログイン中の利用者が別サイトに仕込まれた枠の中で
 * 操作させられたり（クリックジャッキング）、URLに含まれる利用者ID
 * （/shared/<userId> など）が外部サイトへ漏れたりするのを防ぐ。
 *
 * ■ script-src まで含む本格的な CSP は入れていない
 * Next.js は起動用のインラインスクリプトを自前で挿入し、このアプリも
 * ちらつき防止のテーマ切替スクリプトをインラインで持っている。これらを
 * 通すには nonce をリクエストごとに配る必要があり、取りこぼすと画面が
 * 真っ白になる。ここでは**確実に壊れない範囲**に絞り、frame-ancestors
 * だけを CSP で指定する（frame-ancestors はスクリプトの読み込みに一切
 * 影響しない）。script-src の導入は別途、段階的に行う。
 */
const securityHeaders = [
  // 他サイトの iframe に埋め込ませない（クリックジャッキング対策）。
  // X-Frame-Options は古いブラウザ向け、frame-ancestors が現行の指定。
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },

  // Content-Type を無視した推測実行をさせない
  { key: "X-Content-Type-Options", value: "nosniff" },

  // 外部サイトへ遷移するとき、パスやクエリを Referer に載せない。
  // /shared/<userId> のようなURL自体が利用者の情報なので落とす。
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // 使っていないブラウザ機能は明示的に閉じる
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // 一度 https で来た人は、以後 http へ落とさない。
  // ※ includeSubDomains を付けているので、http でしか動かないサブドメインが
  //    ある場合は外すこと。preload は一度登録すると取り消しが難しいので付けない。
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  reactStrictMode: true,
  // 既定では x-powered-by: Next.js を返し、利用フレームワークを外部へ知らせて
  // しまう。脆弱性診断でも「バージョン情報の秘匿化」を指摘されたため止める。
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
