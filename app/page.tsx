import { createClient } from "@/lib/supabase/server";
import { CalendarApp } from "@/components/CalendarApp";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログインでもカレンダーを表示（ゲストモード）。
  // デモデータはクライアント側の guestStore が用意する。
  if (!user) {
    return <CalendarApp userEmail="" isGuest />;
  }

  // 初回ログイン: 実験が無ければデモデータを投入
  const { count } = await supabase
    .from("experiments")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) === 0) {
    await supabase.rpc("seed_demo_data");
  }

  return <CalendarApp userEmail={user.email ?? ""} />;
}
