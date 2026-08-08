"use client";

import Link from "next/link";
import { BackHomeLink } from "./BackHomeLink";
import { ThemeRoot } from "./ThemeRoot";
import { LabPanel, LAB_PANEL_DESCRIPTION } from "./LabPanel";

/**
 * 研究室ページ（/lab）。
 *
 * 中身は LabPanel が持つ。ここはページの外枠（テーマ・ヘッダー・見出し）だけ。
 * 同じ中身を /shared の研究室タブからも使っている。
 */
export function LabManager({
  userEmail,
  isTeacher,
}: {
  userEmail: string;
  /** 教授は自分のカレンダーを持たないので「戻る」先が変わる */
  isTeacher: boolean;
}) {
  return (
    <ThemeRoot>
      <div className="min-h-screen bg-[#f6f8fa] dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
            <BackHomeLink isTeacher={isTeacher} />
            <Link
              href="/shared"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:border-gray-700"
            >
              共有の管理
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">研究室</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {LAB_PANEL_DESCRIPTION}
            </p>
          </div>

          <LabPanel userEmail={userEmail} />
        </main>
      </div>
    </ThemeRoot>
  );
}
