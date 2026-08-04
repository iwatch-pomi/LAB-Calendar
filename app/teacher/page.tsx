import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { TeacherLoginScreen } from "@/components/TeacherLoginScreen";
import { RoleGate } from "@/components/RoleGate";

// ログイン後の画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "学生の予定を確認",
  robots: { index: false, follow: false },
};

/**
 * 教授・指導者向けの管理画面。
 * 未ログイン時はカレンダーへリダイレクトせず、独立したログイン画面をその場で描画する
 * （/app の「未ログインはゲストモードでその場に留まる」パターンと同じ形）。
 */
export default async function TeacherPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <TeacherLoginScreen />;

  return (
    <>
      <RoleGate />
      <TeacherDashboard userEmail={user.email ?? ""} />
    </>
  );
}
