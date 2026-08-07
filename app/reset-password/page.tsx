import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

// 再設定用のリンクから来る画面なので検索結果には出さない。
// middleware の保護ルートには入れない: セッションが無い場合の案内
// （期限切れ・別ブラウザで開いた）をこのページ自身で出したいため、
// ログイン画面へ弾いてしまうと理由が分からなくなる。
export const metadata: Metadata = {
  title: "パスワードの再設定",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
