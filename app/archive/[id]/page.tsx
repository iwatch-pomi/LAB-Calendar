import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArchivedExperimentView } from "@/components/ArchivedExperimentView";

import type { Metadata } from "next";

// ログインが要る画面なので検索結果には出さない
export const metadata: Metadata = {
  title: "アーカイブした実験",
  robots: { index: false, follow: false },
};

/** アーカイブした実験を見返すための閲覧専用カレンダー（別タブで開く想定） */
export default async function ArchivedExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  return <ArchivedExperimentView experimentId={id} />;
}
