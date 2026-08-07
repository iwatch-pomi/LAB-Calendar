"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useSharedWithMe,
  useVisibleProfiles,
  useMyLabs,
  useLabMembers,
  useMyUserId,
  useClaimInvitationsOnce,
  profileLabel,
} from "@/lib/sharedQueries";
import { paletteFor, PALETTE_KEYS } from "@/lib/types";
import { Logo } from "./Logo";
import { useThemeAccountSync } from "./useThemeAccountSync";
import {
  CalendarDays,
  Inbox,
  Users,
  Settings,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { ThemeRoot } from "./ThemeRoot";
import { PendingDeletionBanner } from "./PendingDeletionBanner";

/**
 * 教授・指導者向けの管理画面。
 *
 * 自分のカレンダーは持たず、共有された学生の予定を見るためだけの画面。
 * 実際のカレンダー表示は既存の閲覧専用ページ `/shared/[ownerId]` を使う。
 */
export function TeacherDashboard({ userEmail }: { userEmail: string }) {
  // 学生がメールで招待した分をここで受諾する。これが無いと共有が成立せず
  // 「見られる学生」が永久に空のままになる（カレンダーを開かないため）。
  useClaimInvitationsOnce(true);
  useThemeAccountSync();

  const incomingQ = useSharedWithMe();
  const profilesQ = useVisibleProfiles();
  const labsQ = useMyLabs();
  const meQ = useMyUserId();

  const incoming = incomingQ.data ?? [];
  const labs = labsQ.data ?? [];
  const me = meQ.data ?? null;

  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const activeLab = selectedLab ?? labs[0]?.id ?? null;
  const membersQ = useLabMembers(activeLab);
  const members = membersQ.data ?? [];
  const lab = labs.find((l) => l.id === activeLab) ?? null;

  const [copied, setCopied] = useState(false);

  const profileById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  // 研究室のメンバーのうち、自分以外で予定を公開している人
  const labStudents = members.filter((m) => m.user_id !== me);

  function copyCode() {
    if (!lab) return;
    navigator.clipboard?.writeText(lab.invite_code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <ThemeRoot>
    <div className="min-h-screen bg-[#f6f8fa] dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="transition hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/lab"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Users className="h-4 w-4" />
              研究室
            </Link>
            <Link
              href="/profile"
              title="マイページ"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <PendingDeletionBanner />

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">学生の予定を確認</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共有された学生のカレンダーをまとめて確認できます（閲覧のみ・編集はされません）。
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{userEmail}</p>
        </div>

        {/* 共有されている学生 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-1.5">
            <Inbox className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              共有されているカレンダー
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{incoming.length}</span>
          </div>

          {incomingQ.isLoading ? (
            <p className="py-3 text-center text-xs text-gray-400 dark:text-gray-500">読み込み中…</p>
          ) : incoming.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              まだ共有されているカレンダーはありません。
              <br />
              学生に <span className="font-semibold">{userEmail}</span> 宛へ
              共有してもらうか、下の研究室に参加コードで参加してもらってください。
            </div>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((ownerId) => {
                const label = profileById.get(ownerId) ?? "不明なユーザー";
                const pal = paletteFor(PALETTE_KEYS[0]);
                return (
                  <div
                    key={ownerId}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-700 dark:bg-gray-800/40"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${pal.bg} ${pal.text}`}
                    >
                      {(label[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
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

        {/* 研究室のメンバー */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {lab ? lab.name : "研究室"}
              </h2>
              {lab && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {labStudents.length}人
                </span>
              )}
            </div>
            {lab && (
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                参加コード:{" "}
                <span className="font-mono tracking-widest">
                  {lab.invite_code}
                </span>
              </button>
            )}
          </div>

          {/* 複数の研究室を持っている場合の切り替え */}
          {labs.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {labs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLab(l.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    l.id === activeLab
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {labsQ.isLoading ? (
            <p className="py-3 text-center text-xs text-gray-400 dark:text-gray-500">読み込み中…</p>
          ) : labs.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              研究室をまだ作っていません。研究室を作ると参加コードが発行され、
              学生が参加するだけで予定を確認できるようになります。
              <div className="mt-2.5">
                <Link
                  href="/lab"
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                >
                  <Users className="h-3.5 w-3.5" />
                  研究室を作る
                </Link>
              </div>
            </div>
          ) : labStudents.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400 dark:text-gray-500">
              まだメンバーがいません。参加コードを学生に渡してください。
            </p>
          ) : (
            <div className="space-y-1.5">
              {labStudents.map((m) => {
                const label = profileById.get(m.user_id) ?? "不明なユーザー";
                const pal = paletteFor(PALETTE_KEYS[1]);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-700 dark:bg-gray-800/40"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${pal.bg} ${pal.text}`}
                    >
                      {(label[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                      {label}
                    </span>
                    {m.share_calendar ? (
                      <Link
                        href={`/shared/${m.user_id}`}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        開く
                      </Link>
                    ) : (
                      <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                        非公開
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          個別の共有設定は{" "}
          <Link href="/shared" className="text-brand-600 hover:underline dark:text-brand-400">
            <Share2 className="mr-0.5 inline h-3 w-3" />
            共有の管理
          </Link>{" "}
          から変更できます。
        </p>
      </main>
    </div>
    </ThemeRoot>
  );
}
