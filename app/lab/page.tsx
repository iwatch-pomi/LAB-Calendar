import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeacherServer } from "@/lib/supabase/serverFlags";
import { LabManager } from "@/components/LabManager";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "研究室",
  robots: { index: false, follow: false },
};

/** 研究室（作成・参加コードでの参加・メンバー一覧） */
export default async function LabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 「戻る」先が利用形態で変わるのでサーバーで解決して渡す
  const isTeacher = await isTeacherServer(supabase, user.id);

  return <LabManager userEmail={user.email ?? ""} isTeacher={isTeacher} />;
}
