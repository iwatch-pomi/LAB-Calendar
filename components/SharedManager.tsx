"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useExperiments } from "@/lib/queries";
import {
  useMyShares,
  useSharedWithMe,
  useShareByEmail,
  useRevokeShare,
  useVisibleProfiles,
  profileLabel,
} from "@/lib/sharedQueries";
import type { SharePermission, ShareScope } from "@/lib/types";
import { paletteFor, PALETTE_KEYS } from "@/lib/types";
import {
  ChevronLeft,
  Share2,
  Send,
  Trash2,
  CalendarDays,
  Inbox,
  Users,
} from "lucide-react";

/**
 * 共有の管理ページ。
 * ・自分のカレンダーを誰に見せているか（作成・取り消し）
 * ・自分が見られる他人のカレンダー一覧
 */
export function SharedManager({ userEmail }: { userEmail: string }) {
  const experimentsQ = useExperiments();
  const mySharesQ = useMyShares();
  const incomingQ = useSharedWithMe();
  const profilesQ = useVisibleProfiles();
  const shareByEmail = useShareByEmail();
  const revoke = useRevokeShare();

  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<ShareScope>("all");
  const [experimentId, setExperimentId] = useState<string>("");
  const [permission, setPermission] = useState<SharePermission>("comment");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const experiments = (experimentsQ.data ?? []).filter((e) => !e.archived);
  const myShares = mySharesQ.data ?? [];
  const incoming = incomingQ.data ?? [];

  const profileById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  const expNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of experimentsQ.data ?? []) m.set(e.id, e.name);
    return m;
  }, [experimentsQ.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    if (scope === "experiment" && !experimentId) {
      setError("共有するカレンダーを選んでください。");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const result = await shareByEmail.mutateAsync({
        email: addr,
        scope,
        experimentId: scope === "experiment" ? experimentId : null,
        permission,
      });
      setEmail("");
      setNotice(
        result === "shared"
          ? `${addr} に共有しました。`
          : `${addr} はまだ登録がないため、招待として保存しました。相手が同じメールアドレスで登録すると自動的に共有されます。`,
      );
    } catch {
      setError(
        "共有できませんでした。メールアドレスをご確認ください（自分自身には共有できません）。",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            カレンダーへ戻る
          </Link>
          <Link
            href="/lab"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Users className="h-4 w-4" />
            研究室
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800">カレンダーの共有</h1>
          <p className="mt-1 text-sm text-gray-500">
            教授・先輩・共同研究者にカレンダーを見せて、進捗を共有できます。相手が編集することはできません。
          </p>
        </div>

        {/* 共有する */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">共有する</h2>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              相手のメールアドレス
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prof@example.ac.jp"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-gray-600">
                共有する範囲
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ShareScope)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="all">すべての予定</option>
                  <option value="experiment">特定のカレンダーだけ</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-gray-600">
                相手ができること
                <select
                  value={permission}
                  onChange={(e) =>
                    setPermission(e.target.value as SharePermission)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="comment">閲覧＋コメント</option>
                  <option value="view">閲覧のみ</option>
                </select>
              </label>
            </div>

            {scope === "experiment" && (
              <label className="block text-xs font-semibold text-gray-600">
                共有するカレンダー
                <select
                  value={experimentId}
                  onChange={(e) => setExperimentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="">選択してください</option>
                  {experiments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="submit"
              disabled={shareByEmail.isPending || !email.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {shareByEmail.isPending ? "共有中…" : "共有する"}
            </button>
          </form>

          {notice && (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              {notice}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </section>

        {/* 共有中 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">共有中</h2>
            <span className="text-xs text-gray-400">{myShares.length}</span>
          </div>

          {myShares.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">
              まだ誰にも共有していません。
            </p>
          ) : (
            <div className="space-y-1.5">
              {myShares.map((s) => {
                const who = s.grantee_user_id
                  ? (profileById.get(s.grantee_user_id) ?? "不明なユーザー")
                  : "研究室";
                const what =
                  s.scope === "all"
                    ? "すべての予定"
                    : `${expNameById.get(s.experiment_id ?? "") ?? "（削除されたカレンダー）"} のみ`;
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {who}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
                      {what}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
                      {s.permission === "comment" ? "閲覧＋コメント" : "閲覧のみ"}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`${who} への共有を取り消しますか？`))
                          revoke.mutate(s.id);
                      }}
                      title="共有を取り消す"
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 自分が見られるカレンダー */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Inbox className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              自分が見られるカレンダー
            </h2>
            <span className="text-xs text-gray-400">{incoming.length}</span>
          </div>

          {incomingQ.isLoading ? (
            <p className="py-3 text-center text-xs text-gray-400">読み込み中…</p>
          ) : incoming.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">
              共有されているカレンダーはありません。
            </p>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((ownerId) => {
                const label = profileById.get(ownerId) ?? "不明なユーザー";
                const pal = paletteFor(PALETTE_KEYS[0]);
                return (
                  <div
                    key={ownerId}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${pal.bg} ${pal.text}`}
                    >
                      {(label[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {label}
                    </span>
                    <Link
                      href={`/shared/${ownerId}`}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      開く
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
