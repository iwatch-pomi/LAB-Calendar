import { redirect } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/authGate";

/**
 * ログインUIはカレンダー上のモーダルに統合したため、専用ページは持たない。
 * 既存のブックマークやメール内リンク（Supabaseのメールテンプレート含む）が
 * ここを指しているので、ページ自体は残してカレンダーへ送る。
 * `/` は公式サイトになり認証モーダルを持たないため、行き先は `/app`。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // 受付を止めている間は、ログインモーダルを開く印（login=1）を付けない。
  // 保護ページから弾かれて来た人も、そのままゲストのカレンダーに着地する。
  if (!AUTH_ENABLED) redirect("/app");
  const params = new URLSearchParams({ login: "1" });
  if (sp.error) params.set("error", String(sp.error));
  if (sp.next) params.set("next", String(sp.next));
  redirect(`/app?${params.toString()}`);
}
