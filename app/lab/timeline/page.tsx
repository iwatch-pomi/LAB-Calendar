import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeacherServer } from "@/lib/supabase/serverFlags";
import { LabTimelinePage } from "@/components/LabTimelinePage";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "研究室の予定",
  robots: { index: false, follow: false },
};

/**
 * 研究室のメンバー全員の予定を1画面で見る（主宰・スタッフ向け）。
 *
 * `?lab=` で最初に開く研究室を受け取る。入口のボタンがそのとき選択中の
 * 研究室を渡してくるので、複数持っていても選び直さずに済む。
 */
export default async function LabTimelineRoute({
  searchParams,
}: {
  searchParams: Promise<{ lab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 「戻る」先が利用形態で変わるのでサーバーで解決して渡す
  const isTeacher = await isTeacherServer(supabase, user.id);
  const { lab } = await searchParams;

  return <LabTimelinePage isTeacher={isTeacher} initialLabId={lab ?? null} />;
}
