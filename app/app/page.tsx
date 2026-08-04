import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarApp } from "@/components/CalendarApp";
import { RoleGate } from "@/components/RoleGate";

// 学生向けカレンダー本体。ログイン後の画面なので検索結果には出さない
// （robots.txt の disallow はクロールを止めるだけでインデックスは止めないため、
//  meta robots でも明示する）。
export const metadata: Metadata = {
  title: "カレンダー",
  robots: { index: false, follow: false },
};

export default async function AppPage() {
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
  return (
    <>
      <RoleGate />
      <CalendarApp userEmail={user.email ?? ""} />
    </>
  );
}
