import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CultureManager } from "@/components/CultureManager";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "継代培養を管理",
  robots: { index: false, follow: false },
};

export default async function CulturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <CultureManager userEmail={user.email ?? ""} />;
}
