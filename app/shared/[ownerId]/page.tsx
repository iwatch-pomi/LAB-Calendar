import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedCalendarView } from "@/components/SharedCalendarView";

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
