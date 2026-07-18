"use client";

import {
  buildMonthGrid,
  nowMs,
  tokyoMidnightMs,
  fmtTime,
  orderedWeekdayJp,
} from "@/lib/calendar";
import { paletteFor, type Task } from "@/lib/types";

export function MonthView({
  refMs,
  tasks,
  expColorById,
  weekStartsOn,
  onTaskClick,
  onCreateAt,
}: {
  refMs: number;
  tasks: Task[];
  expColorById: Map<string, string>;
  weekStartsOn: 0 | 1;
  onTaskClick: (t: Task) => void;
  onCreateAt: (startMs: number) => void;
}) {
  const weeks = buildMonthGrid(refMs, nowMs(), weekStartsOn);
  const curMonth = new Date(refMs + 540 * 60000).getUTCMonth() + 1;
  const weekdayHeader = orderedWeekdayJp(weekStartsOn);

  // 日付キー → タスク
  const byDay = new Map<number, Task[]>();
  for (const t of tasks) {
    const mid = tokyoMidnightMs(new Date(t.start_time).getTime());
    if (!byDay.has(mid)) byDay.set(mid, []);
    byDay.get(mid)!.push(t);
  }
  for (const arr of byDay.values())
    arr.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekdayHeader.map((w) => (
          <div
            key={w}
            className={`py-2 text-center text-xs font-medium ${
              w === "日" ? "text-rose-400" : w === "土" ? "text-sky-400" : "text-gray-400"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-rows-1">
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(${weeks.length}, minmax(0,1fr))`,
          }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((cell) => {
                const dayTasks = byDay.get(cell.startMs) ?? [];
                const isOther = cell.month !== curMonth;
                return (
                  <div
                    key={cell.startMs}
                    onClick={() => onCreateAt(cell.startMs + 9 * 60 * 60 * 1000)}
                    title="クリックで予定を追加"
                    className={`min-h-0 cursor-pointer overflow-hidden border-b border-l border-gray-100 p-1.5 hover:bg-brand-50/40 ${
                      cell.isWeekend ? "bg-gray-50/40" : ""
                    }`}
                  >
                    <div
                      className={`mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        cell.isToday
                          ? "bg-brand-500 text-white"
                          : isOther
                            ? "text-gray-300"
                            : "text-gray-600"
                      }`}
                    >
                      {cell.dateNum}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => {
                        const pal = paletteFor(
                          t.experiment_id
                            ? expColorById.get(t.experiment_id) ?? "teal"
                            : "teal",
                        );
                        return (
                          <button
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick(t);
                            }}
                            className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] ${pal.bg} ${pal.text} hover:brightness-95`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${pal.dot}`}
                            />
                            <span className="truncate">
                              {fmtTime(new Date(t.start_time).getTime())}{" "}
                              {t.title}
                            </span>
                          </button>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="px-1 text-[10px] text-gray-400">
                          +{dayTasks.length - 3} 件
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
