"use client";

import type { ReschedulePlan } from "./CalendarApp";
import { fmtTime, WEEKDAY_JP } from "@/lib/calendar";
import { paletteFor, type Task } from "@/lib/types";
import { AlertTriangle, ArrowRight, Wand2 } from "lucide-react";

function dayTimeLabel(ms: number): string {
  const s = new Date(ms + 540 * 60000);
  const wd = WEEKDAY_JP[s.getUTCDay()];
  return `${s.getUTCMonth() + 1}/${s.getUTCDate()}(${wd}) ${fmtTime(ms)}`;
}

export function RescheduleDialog({
  plan,
  tasks,
  expColorById,
  onCancel,
  onConfirm,
  committing,
}: {
  plan: ReschedulePlan;
  tasks: Task[];
  expColorById: Map<string, string>;
  onCancel: () => void;
  onConfirm: () => void;
  committing: boolean;
}) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const rows = plan.moves
    .map((mv) => {
      const t = taskById.get(mv.id);
      if (!t) return null;
      const oldStart = new Date(t.start_time).getTime();
      const changed = Math.abs(oldStart - mv.start) > 60000;
      return { task: t, oldStart, newStart: mv.start, changed };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const changedCount = rows.filter((r) => r.changed).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-gray-100 bg-rose-50 px-5 py-4">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              「{plan.failedTitle}」の失敗に伴う自動リスケ
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              依存する後続タスクを、装置予約と稼働時間を考慮して最も早い空き日程へ再配置します。
            </p>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">
            変更対象 {changedCount} 件
          </div>
          <div className="space-y-1.5">
            {rows.map((r) => {
              const pal = paletteFor(
                r.task.experiment_id
                  ? expColorById.get(r.task.experiment_id) ?? "teal"
                  : "teal",
              );
              return (
                <div
                  key={r.task.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    r.changed
                      ? "border-brand-200 bg-brand-50/50"
                      : "border-gray-100 bg-gray-50/50 opacity-60"
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${pal.dot}`} />
                  <span className="w-32 shrink-0 truncate text-sm font-medium text-gray-700">
                    {r.task.title}
                  </span>
                  {r.changed ? (
                    <div className="flex flex-1 items-center gap-1.5 text-xs">
                      <span className="text-gray-400 line-through">
                        {dayTimeLabel(r.oldStart)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-brand-500" />
                      <span className="font-semibold text-brand-700">
                        {dayTimeLabel(r.newStart)}
                      </span>
                    </div>
                  ) : (
                    <span className="flex-1 text-xs text-gray-400">
                      変更なし
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onCancel}
            disabled={committing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={committing}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            {committing ? "再配置中…" : "自動リスケを実行"}
          </button>
        </div>
      </div>
    </div>
  );
}
