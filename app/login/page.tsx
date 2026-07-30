import { redirect } from "next/navigation";

/**
 * ログインUIはカレンダー上のモーダルに統合したため、専用ページは持たない。
 * 既存のブックマークやメール内リンクのために、モーダルを開いた状態のホームへ送る。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ login: "1" });
  if (sp.error) params.set("error", String(sp.error));
  redirect(`/?${params.toString()}`);
}
