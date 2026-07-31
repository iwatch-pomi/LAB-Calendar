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

  // 初回ログイン時にデモデータを使うかどうかは、クライアント側で
  // ユーザーに確認してから決める（DemoDataChoiceModal）。
  return <CalendarApp userEmail={user.email ?? ""} />;
}
