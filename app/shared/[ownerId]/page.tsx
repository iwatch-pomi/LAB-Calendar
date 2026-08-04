import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedCalendarView } from "@/components/SharedCalendarView";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "共有されたカレンダー",
  robots: { index: false, follow: false },
};

/** 共有されたカレンダーの閲覧専用ビュー */
export default async function SharedCalendarPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { ownerId } = await params;
  return <SharedCalendarView ownerId={ownerId} />;
}
