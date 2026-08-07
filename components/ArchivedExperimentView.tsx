"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useExperiments,
  useTasks,
  useDependencies,
  useEquipment,
  useSettings,
} from "@/lib/queries";
import {
  buildRange,
  fmtWeekRange,
  fmtMonthTitle,
  fmtDayTitle,
  fmtTime,
  fmtTimeRange,
  nowMs,
  DAY,
} from "@/lib/calendar";
import {
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
} from "@/lib/config";
import { paletteFor, type Task } from "@/lib/types";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import type { ViewMode } from "./CalendarApp";
import {
  ArrowLeft,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  planning: "未着手",
  in_progress: "進行中",
  done: "完了",
  failed: "失敗",
};

function fmtDate(ms: number): string {
  const d = new Date(ms + 540 * 60000);
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/**
 * アーカイブした実験を「見返す」ための閲覧専用カレンダー。
 * その実験の予定だけを表示し、追加・移動・リサイズはできない。
 */
export function ArchivedExperimentView({
  experimentId,
}: {
  experimentId: string;
}) {
  const experimentsQ = useExperiments();
  const tasksQ = useTasks();
  const depsQ = useDependencies();
  const equipmentQ = useEquipment();
  const settingsQ = useSettings();

  const [view, setView] = useState<ViewMode>("week");
  const [refMs, setRefMs] = useState<number | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const experiment = (experimentsQ.data ?? []).find(
    (e) => e.id === experimentId,
  );

  // この実験の予定だけに絞る
  const tasks = useMemo(
    () =>
      (tasksQ.data ?? []).filter((t) => t.experiment_id === experimentId),
    [tasksQ.data, experimentId],
  );

  const equipment = equipmentQ.data ?? [];
  const equipNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of equipment) m.set(e.id, e.name);
    return m;
  }, [equipment]);

  const expColorById = useMemo(() => {
    const m = new Map<string, string>();
    if (experiment) m.set(experiment.id, experiment.color);
    return m;
  }, [experiment]);

  // 実験の期間（最初の予定〜最後の予定）
  const period = useMemo(() => {
    if (tasks.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const t of tasks) {
      min = Math.min(min, new Date(t.start_time).getTime());
      max = Math.max(max, new Date(t.end_time).getTime());
    }
    return { min, max };
  }, [tasks]);

  // 既定の表示位置は「最初の予定の週」。アーカイブは過去のことが多く、
  // 今週を開いても何も無いため。
  const loading =
    experimentsQ.isLoading || tasksQ.isLoading || equipmentQ.isLoading;
  const effectiveRef = refMs ?? period?.min ?? nowMs();

  const weekStartsOn: 0 | 1 = settingsQ.data?.week_start_day === 0 ? 0 : 1;
  const workStartHour =
    typeof settingsQ.data?.work_start_hour === "number"
      ? settingsQ.data.work_start_hour
      : DEFAULT_WORK_START_HOUR;
  const workEndHour =
    typeof settingsQ.data?.work_end_hour === "number"
      ? settingsQ.data.work_end_hour
      : DEFAULT_WORK_END_HOUR;

  const cells = buildRange(effectiveRef, nowMs(), 7, weekStartsOn);
  const title =
    view === "month"
      ? fmtMonthTitle(effectiveRef)
      : view === "day"
        ? fmtDayTitle(effectiveRef)
        : fmtWeekRange(cells);
  const step = view === "month" ? 30 * DAY : view === "day" ? DAY : 7 * DAY;

  const usedEquipment = useMemo(() => {
    const names = new Set<string>();
    for (const t of tasks) {
      if (t.equipment_id) {
        const n = equipNameById.get(t.equipment_id);
        if (n) names.add(n);
      }
    }
    return [...names];
  }, [tasks, equipNameById]);

  if (!loading && !experiment) {
    return (
      <div data-theme-root suppressHydrationWarning>
      <div className="grid min-h-screen place-items-center bg-[#f6f8fa] p-6 dark:bg-gray-950">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            この実験は見つかりませんでした。
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            マイページへ戻る
          </Link>
        </div>
      </div>
      </div>
    );
  }

  const pal = paletteFor(experiment?.color ?? "teal");

  return (
    // Tailwind の dark: は「.dark を祖先に持つ要素」にしか効かず、同じ要素に
    // .dark と dark:bg-... を両方付けても背景色が付かない。目印(data-theme-root)
    // だけを持つ外枠を1枚足し、実際のスタイルは内側の div に持たせる。
    <div data-theme-root suppressHydrationWarning>
      <div className="flex h-screen flex-col overflow-hidden bg-[#f6f8fa] dark:bg-gray-950">
        {/* 見出し */}
        <header className="border-b border-gray-200 bg-white px-4 py-3 dark:bg-gray-900 dark:border-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-1 text-xs text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              マイページ
            </Link>
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <Archive className="h-3 w-3" />
              アーカイブ
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Eye className="h-3 w-3" />
              閲覧専用
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`h-3 w-3 shrink-0 rounded-full ${pal.dot}`} />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {experiment?.name ?? "…"}
            </h1>
            {experiment && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {STATUS_LABEL[experiment.status] ?? experiment.status}
              </span>
            )}
            {period && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {fmtDate(period.min)} 〜 {fmtDate(period.max)}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">予定 {tasks.length} 件</span>
            {usedEquipment.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                使用機器: {usedEquipment.join(" / ")}
              </span>
            )}
          </div>
        </header>

        {/* 表示切替と日付ナビ */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm dark:bg-gray-800 dark:border-gray-700">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    view === v
                      ? "bg-white text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {v === "day" ? "日" : v === "week" ? "週" : "月"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setRefMs(effectiveRef - step)}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="whitespace-nowrap text-center text-sm font-semibold text-gray-800 sm:min-w-[7rem] dark:text-gray-100">
                {title}
              </span>
              <button
                onClick={() => setRefMs(effectiveRef + step)}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {period && (
            <button
              onClick={() => setRefMs(period.min)}
              className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:border-gray-700"
            >
              実験の開始日へ
            </button>
          )}
        </div>

        {/* カレンダー本体（閲覧専用） */}
        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {loading ? (
            <div className="grid h-full place-items-center text-sm text-gray-400 dark:text-gray-500">
              読み込み中…
            </div>
          ) : tasks.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-gray-400 dark:text-gray-500">
              この実験にはまだ予定がありません。
            </div>
          ) : view !== "month" ? (
            <WeekView
              refMs={effectiveRef}
              tasks={tasks}
              deps={depsQ.data ?? []}
              expColorById={expColorById}
              equipNameById={equipNameById}
              selectedExperiment={null}
              visibleDays={view === "day" ? 1 : 7}
              weekStartsOn={weekStartsOn}
              workStartHour={workStartHour}
              workEndHour={workEndHour}
              onTaskClick={setOpenTask}
              onCreateAt={() => {}}
              readOnly
            />
          ) : (
            <MonthView
              refMs={effectiveRef}
              tasks={tasks}
              expColorById={expColorById}
              weekStartsOn={weekStartsOn}
              onTaskClick={setOpenTask}
              onCreateAt={() => {}}
              readOnly
            />
          )}
        </div>

        {openTask && (
          <TaskDetail
            task={openTask}
            equipmentName={
              openTask.equipment_id
                ? equipNameById.get(openTask.equipment_id) ?? null
                : null
            }
            onClose={() => setOpenTask(null)}
          />
        )}
      </div>
    </div>
  );
}

/** 予定の内容を確認するだけの読み取り専用パネル */
function TaskDetail({
  task,
  equipmentName,
  onClose,
}: {
  task: Task;
  equipmentName: string | null;
  onClose: () => void;
}) {
  const startMs = new Date(task.start_time).getTime();
  const endMs = new Date(task.end_time).getTime();

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-base font-bold text-gray-800 dark:text-gray-100">
            {task.title}
          </h2>
          <button
            onClick={onClose}
            title="閉じる"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="space-y-2 text-sm">
          <Row label="日時">
            {fmtDate(startMs)} {fmtTimeRange(startMs, endMs)}
          </Row>
          {task.subtitle && <Row label="メモ">{task.subtitle}</Row>}
          <Row label="種別">
            {task.task_kind === "culture"
              ? "培養時間"
              : task.is_wait
                ? "待機時間"
                : "実験操作"}
          </Row>
          <Row label="状態">
            {task.status === "done"
              ? "完了"
              : task.status === "failed"
                ? "失敗"
                : "予定"}
          </Row>
          {equipmentName && <Row label="使用機器">{equipmentName}</Row>}
          {task.notes && <Row label="ノート">{task.notes}</Row>}
        </dl>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          アーカイブの閲覧専用ビューのため、ここでは編集できません。
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-xs text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">
        {children}
      </dd>
    </div>
  );
}
