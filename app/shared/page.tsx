import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeacherServer } from "@/lib/supabase/serverFlags";
import { SharedManager } from "@/components/SharedManager";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "カレンダーの共有",
  robots: { index: false, follow: false },
};

/** 共有の管理（共有する / 共有中の一覧 / 自分が見られるカレンダー） */
export default async function SharedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 「戻る」先が利用形態で変わるのでサーバーで解決して渡す
  const isTeacher = await isTeacherServer(supabase, user.id);

  return <SharedManager userEmail={user.email ?? ""} isTeacher={isTeacher} />;
}
