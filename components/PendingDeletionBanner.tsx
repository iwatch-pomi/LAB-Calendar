"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useDeletionSchedule, useCancelAccountDeletion } from "@/lib/queries";
import {
  daysUntilDeletion,
  isDeletionDue,
  formatDeletionDate,
} from "@/lib/accountDeletion";
import { nowMs } from "@/lib/calendar";

/**
 * 退会を予約している間ずっと出す予告バナー。
 *
 * 猶予期間を設けても、それに気付けなければ意味がない（気付かないまま
 * 7日が過ぎて消える、が最悪の結果）。カレンダー・マイページ・教授の管理画面の
 * すべてに出し、どこからでも取り消せるようにする。
 *
 * 予約していないときは何も描画しないので、置くだけでよい。
 */
export function PendingDeletionBanner() {
  const scheduleQ = useDeletionSchedule();
  const cancel = useCancelAccountDeletion();
  const [error, setError] = useState<string | null>(null);

  const scheduledAt = scheduleQ.data;
  if (!scheduledAt) return null;

  const due = isDeletionDue(scheduledAt, nowMs());
  const left = daysUntilDeletion(scheduledAt, nowMs());
  const date = formatDeletionDate(scheduledAt);

  async function onCancel() {
    setError(null);
    try {
      await cancel.mutateAsync();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取り消せませんでした");
    }
  }

  return (
    <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 text-rose-900 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="min-w-0">
            {due ? (
              <>
                このアカウントは
                <span className="font-semibold">まもなく削除されます</span>
                。取り消す場合はお早めに。
              </>
            ) : (
              <>
                このアカウントは{" "}
                <span className="font-semibold">
                  {date}（あと{left}日）
                </span>{" "}
                に削除されます。
              </>
            )}
          </span>
        </span>
        <button
          onClick={onCancel}
          disabled={cancel.isPending}
          className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/40 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          {cancel.isPending ? "取り消しています…" : "削除を取り消す"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
