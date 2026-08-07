import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeacherServer } from "@/lib/supabase/serverFlags";
import { TEACHER_HOME } from "@/lib/authRedirect";
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

  // 教授・指導者は自分のカレンダーを持たないので、どこから来ても管理画面へ送る。
  // ここ一箇所で、ブックマーク・各ページの「戻る」・公式サイトのCTA・
  // ログイン後の既定遷移がすべて正しくなる。
  // /teacher は決して /app へ戻さない（未ログインは専用ログイン画面を出すだけ）ので、
  // この転送は終端でありループしない。判定に失敗した場合は学生として扱われる。
  if (await isTeacherServer(supabase, user.id)) redirect(TEACHER_HOME);

  // 初回ログイン時にデモデータを使うかどうかは、クライアント側で
  // ユーザーに確認してから決める（DemoDataChoiceModal）。
  return (
    <>
      <RoleGate />
      <CalendarApp userEmail={user.email ?? ""} />
    </>
  );
}
