"use client";

import { useState } from "react";
import Link from "next/link";
import { BackHomeLink } from "./BackHomeLink";
import { ThemeRoot } from "./ThemeRoot";
import { LabTimeline } from "./LabTimeline";
import { useMyLabs, useLabMembers, useMyUserId } from "@/lib/sharedQueries";
import { Users } from "lucide-react";

/**
 * `/lab/timeline` の外枠。テーマ・ヘッダー・見出し・研究室の選択を持ち、
 * 中身は LabTimeline に任せる。
 */
export function LabTimelinePage({
  isTeacher,
  initialLabId,
}: {
  /** 教授は自分のカレンダーを持たないので「戻る」先が変わる */
  isTeacher: boolean;
  /** ?lab= で渡された研究室。無ければ先頭を開く */
  initialLabId: string | null;
}) {
  const labsQ = useMyLabs();
  const meQ = useMyUserId();
  const labs = labsQ.data ?? [];
  const me = meQ.data ?? null;

  const [selectedLab, setSelectedLab] = useState<string | null>(initialLabId);
  // ?lab= が今の所属に無い（消えた・他人のもの）場合は先頭に落とす
  const activeLab =
    (labs.some((l) => l.id === selectedLab) ? selectedLab : null) ??
    labs[0]?.id ??
    null;

  const membersQ = useLabMembers(activeLab);
  const myMembership = (membersQ.data ?? []).find((m) => m.user_id === me);
  const iManage =
    myMembership?.role === "owner" || myMembership?.role === "staff";
  const lab = labs.find((l) => l.id === activeLab) ?? null;

  // メンバーが読めるまでは権限の判定ができない。ここで「権限がありません」を
  // 先に出すと、正しい主宰にも一瞬エラーが見えてしまう
  const checking = labsQ.isLoading || membersQ.isLoading;

  return (
    <ThemeRoot>
      <div className="min-h-screen bg-[#f6f8fa] dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
            <BackHomeLink isTeacher={isTeacher} />
            <Link
              href="/lab"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              研究室の管理
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              研究室の予定
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              メンバーの予定を並べて、研究室全体の動きをまとめて確認できます。
            </p>
          </div>

          {/* 研究室の切り替え */}
          {labs.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {labs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLab(l.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    l.id === activeLab
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {checking ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
              読み込み中…
            </div>
          ) : !activeLab ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  研究室がありません
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                研究室を作ると、参加したメンバーの予定をここにまとめて表示できます。
              </p>
              <Link
                href="/lab"
                className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                研究室を作る
              </Link>
            </div>
          ) : !iManage ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                この画面は主宰・スタッフ向けです
              </h2>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {lab ? `「${lab.name}」の` : ""}
                メンバー全員の予定をまとめて見られるのは、研究室の主宰とスタッフだけです。
                自分の予定はカレンダーから確認できます。
              </p>
            </div>
          ) : (
            <LabTimeline labId={activeLab} />
          )}
        </main>
      </div>
    </ThemeRoot>
  );
}
