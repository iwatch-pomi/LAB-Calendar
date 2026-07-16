"use client";

import type { ReactNode } from "react";
import {
  buildRange,
  fmtWeekRange,
  fmtMonthTitle,
  nowMs,
  DAY,
} from "@/lib/calendar";
import type { ViewMode } from "./CalendarApp";
import { ChevronLeft, ChevronRight, Plus, PanelLeft } from "lucide-react";

export function CalendarHeader({
  view,
  onViewChange,
  refMs,
  onRefChange,
  onToggleSidebar,
  visibleDays,
  onAddClick,
  addMenuOpen,
  addMenu,
}: {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  refMs: number;
  onRefChange: (ms: number) => void;
  onToggleSidebar: () => void;
  visibleDays: number;
  onAddClick: () => void;
  addMenuOpen: boolean;
  addMenu: ReactNode;
}) {
  const cells = buildRange(refMs, nowMs(), visibleDays);
  const title =
    view === "week" ? fmtWeekRange(cells) : fmtMonthTitle(refMs);
  const step = view === "week" ? visibleDays * DAY : 30 * DAY;
  const todayLabel =
    view === "month" ? "今月" : visibleDays >= 7 ? "今週" : "今日";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* サイドバー開閉 */}
        <button
          onClick={onToggleSidebar}
          title="サイドバーを開閉"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* 週/月 トグル */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
          <button
            onClick={() => onViewChange("week")}
            className={`rounded-md px-3 py-1 font-medium transition ${
              view === "week"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            週
          </button>
          <button
            onClick={() => onViewChange("month")}
            className={`rounded-md px-3 py-1 font-medium transition ${
              view === "month"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            月
          </button>
        </div>

        {/* 日付ナビ */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRefChange(refMs - step)}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-800">
            {title}
          </span>
          <button
            onClick={() => onRefChange(refMs + step)}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onRefChange(nowMs())}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {todayLabel}
        </button>

        <div className="relative">
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            実験を追加
          </button>
          {addMenuOpen && addMenu}
        </div>
      </div>
    </header>
  );
}
