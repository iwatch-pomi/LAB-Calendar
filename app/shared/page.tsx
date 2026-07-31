import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedManager } from "@/components/SharedManager";

/** 共有の管理（共有する / 共有中の一覧 / 自分が見られるカレンダー） */
export default async function SharedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SharedManager userEmail={user.email ?? ""} />;
}
