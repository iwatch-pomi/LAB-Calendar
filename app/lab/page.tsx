import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LabManager } from "@/components/LabManager";

/** 研究室（作成・参加コードでの参加・メンバー一覧） */
export default async function LabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <LabManager userEmail={user.email ?? ""} />;
}
