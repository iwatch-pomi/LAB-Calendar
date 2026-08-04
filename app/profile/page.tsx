import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return <ProfileView userEmail={user.email ?? ""} />;
}
