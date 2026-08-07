import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeacherServer } from "@/lib/supabase/serverFlags";
import { ProfileView } from "@/components/ProfileView";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 利用形態はサーバーで解決して渡す。クライアントの useSettings を待つと、
  // 学生向けの設定が一瞬出てから畳まれる（ProfileView はロード状態を持たない）。
  const initialIsTeacher = await isTeacherServer(supabase, user.id);

  return (
    <ProfileView
      userEmail={user.email ?? ""}
      initialIsTeacher={initialIsTeacher}
    />
  );
}
