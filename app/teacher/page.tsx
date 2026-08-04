import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { RoleGate } from "@/components/RoleGate";

// ログイン後の画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "学生の予定を確認",
  robots: { index: false, follow: false },
};

/** 教授・指導者向けの管理画面（middleware で保護済み） */
export default async function TeacherPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/teacher");

  return (
    <>
      <RoleGate />
      <TeacherDashboard userEmail={user.email ?? ""} />
    </>
  );
}
