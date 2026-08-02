/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 既定では x-powered-by: Next.js を返し、利用フレームワークを外部へ知らせて
  // しまう。脆弱性診断でも「バージョン情報の秘匿化」を指摘されたため止める。
  poweredByHeader: false,
};

export default nextConfig;
