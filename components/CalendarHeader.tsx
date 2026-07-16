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
    <header className="flex items-center justify-between gap-1 border-b border-gray-200 bg-white px-2 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
        {/* サイドバー開閉 */}
        <button
          onClick={onToggleSidebar}
          title="サイドバーを開閉"
          className="shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* 週/月 トグル */}
        <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
          <button
            onClick={() => onViewChange("week")}
            className={`rounded-md px-2 py-1 font-medium transition sm:px-3 ${
              view === "week"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            週
          </button>
          <button
            onClick={() => onViewChange("month")}
            className={`rounded-md px-2 py-1 font-medium transition sm:px-3 ${
              view === "month"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            }`}
          >
            月
          </button>
        </div>

        {/* 日付ナビ */}
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => onRefChange(refMs - step)}
            className="shrink-0 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 sm:p-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="whitespace-nowrap text-center text-[13px] font-semibold text-gray-800 sm:min-w-[9.5rem] sm:text-sm">
            {title}
          </span>
          <button
            onClick={() => onRefChange(refMs + step)}
            className="shrink-0 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 sm:p-1.5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onRefChange(nowMs())}
          className="whitespace-nowrap rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 sm:px-3"
        >
          {todayLabel}
        </button>

        <div className="relative">
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 sm:px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">実験を追加</span>
          </button>
          {addMenuOpen && addMenu}
        </div>
      </div>
    </header>
  );
}
