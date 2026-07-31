"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useSharedExperiments,
  useSharedTasks,
  useSharedDeps,
  useSharedEquipment,
  useVisibleProfiles,
  useMyUserId,
  useTaskComments,
  useAddTaskComment,
  useDeleteTaskComment,
  profileLabel,
} from "@/lib/sharedQueries";
import { useSettings } from "@/lib/queries";
import {
  buildRange,
  fmtWeekRange,
  fmtMonthTitle,
  fmtDayTitle,
  fmtTimeRange,
  nowMs,
  DAY,
} from "@/lib/calendar";
import { DEFAULT_WORK_START_HOUR, DEFAULT_WORK_END_HOUR } from "@/lib/config";
import { paletteFor, PALETTE_KEYS, type Task } from "@/lib/types";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import type { ViewMode } from "./CalendarApp";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Send,
  Trash2,
  CheckCircle2,
  CircleDot,
  AlertTriangle,
} from "lucide-react";

function fmtDate(ms: number): string {
  const d = new Date(ms + 540 * 60000);
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/**
 * 共有されたカレンダーの閲覧専用ビュー。
 * 編集用のフックを一切使わないので、ここから予定が変わることはない。
 * 表示設定（週の開始曜日など）は相手のものを読めないため閲覧者自身の設定を使う。
 */
export function SharedCalendarView({ ownerId }: { ownerId: string }) {
  const experimentsQ = useSharedExperiments(ownerId);
  const tasksQ = useSharedTasks(ownerId);
  const depsQ = useSharedDeps(ownerId);
  const equipmentQ = useSharedEquipment(ownerId);
  const profilesQ = useVisibleProfiles();
  const meQ = useMyUserId();
  const settingsQ = useSettings();

  const [view, setView] = useState<ViewMode>("week");
  const [refMs, setRefMs] = useState<number>(() => nowMs());
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const tasks = tasksQ.data ?? [];
  const experiments = experimentsQ.data ?? [];
  const equipment = equipmentQ.data ?? [];

  const owner = (profilesQ.data ?? []).find((p) => p.user_id === ownerId);
  const ownerName = profileLabel(owner);

  const expColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of experiments) m.set(e.id, e.color);
    return m;
  }, [experiments]);

  const equipNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of equipment) m.set(e.id, e.name);
    return m;
  }, [equipment]);

  const weekStartsOn: 0 | 1 = settingsQ.data?.week_start_day === 0 ? 0 : 1;
  const workStartHour =
    typeof settingsQ.data?.work_start_hour === "number"
      ? settingsQ.data.work_start_hour
      : DEFAULT_WORK_START_HOUR;
  const workEndHour =
    typeof settingsQ.data?.work_end_hour === "number"
      ? settingsQ.data.work_end_hour
      : DEFAULT_WORK_END_HOUR;

  const cells = buildRange(refMs, nowMs(), 7, weekStartsOn);
  const title =
    view === "month"
      ? fmtMonthTitle(refMs)
      : view === "day"
        ? fmtDayTitle(refMs)
        : fmtWeekRange(cells);
  const step = view === "month" ? 30 * DAY : view === "day" ? DAY : 7 * DAY;

  // 表示中の期間の進捗サマリー（クライアント計算のみ）
  const summary = useMemo(() => {
    const from = cells[0]?.startMs ?? refMs;
    const to = (cells[cells.length - 1]?.startMs ?? refMs) + DAY;
    const inRange = tasks.filter((t) => {
      const s = new Date(t.start_time).getTime();
      return s >= from && s < to;
    });
    return {
      total: inRange.length,
      done: inRange.filter((t) => t.status === "done").length,
      failed: inRange.filter((t) => t.status === "failed").length,
      planned: inRange.filter((t) => t.status === "planned").length,
    };
  }, [tasks, cells, refMs]);

  const loading = tasksQ.isLoading || experimentsQ.isLoading;
  const pal = paletteFor(PALETTE_KEYS[0]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f8fa]">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link
            href="/shared"
            className="flex items-center gap-1 text-xs text-gray-500 transition hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            共有の管理
          </Link>
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            <Eye className="h-3 w-3" />
            閲覧専用
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${pal.bg} ${pal.text}`}
          >
            {(ownerName[0] ?? "?").toUpperCase()}
          </span>
          <h1 className="text-lg font-bold text-gray-800">
            {ownerName} のカレンダー
          </h1>
          <span className="text-xs text-gray-500">
            予定 {tasks.length} 件 / カレンダー {experiments.length} 件
          </span>
        </div>
      </header>

      {/* 表示切替・日付ナビ・期間サマリー */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  view === v
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {v === "day" ? "日" : v === "week" ? "週" : "月"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRefMs(refMs - step)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="whitespace-nowrap text-center text-sm font-semibold text-gray-800 sm:min-w-[7rem]">
              {title}
            </span>
            <button
              onClick={() => setRefMs(refMs + step)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setRefMs(nowMs())}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            今日
          </button>
        </div>

        {view !== "month" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              完了 {summary.done}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
              <CircleDot className="h-3 w-3" />
              予定 {summary.planned}
            </span>
            {summary.failed > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                失敗 {summary.failed}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        {loading ? (
          <div className="grid h-full place-items-center text-sm text-gray-400">
            読み込み中…
          </div>
        ) : tasks.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-gray-400">
            共有されている予定がありません。
          </div>
        ) : view !== "month" ? (
          <WeekView
            refMs={refMs}
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
            refMs={refMs}
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
        <SharedTaskDetail
          task={openTask}
          equipmentName={
            openTask.equipment_id
              ? (equipNameById.get(openTask.equipment_id) ?? null)
              : null
          }
          myId={meQ.data ?? null}
          onClose={() => setOpenTask(null)}
        />
      )}
    </div>
  );
}

/** 予定の詳細＋コメント（編集はできない） */
function SharedTaskDetail({
  task,
  equipmentName,
  myId,
  onClose,
}: {
  task: Task;
  equipmentName: string | null;
  myId: string | null;
  onClose: () => void;
}) {
  const commentsQ = useTaskComments(task.id);
  const addComment = useAddTaskComment();
  const delComment = useDeleteTaskComment();
  const profilesQ = useVisibleProfiles();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startMs = new Date(task.start_time).getTime();
  const endMs = new Date(task.end_time).getTime();
  const comments = commentsQ.data ?? [];

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setError(null);
    try {
      await addComment.mutateAsync({ taskId: task.id, body: text });
      setBody("");
    } catch {
      setError("コメントできませんでした（権限が無い可能性があります）。");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-base font-bold text-gray-800">
            {task.title}
          </h2>
          <button
            onClick={onClose}
            title="閉じる"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mb-4 space-y-2 text-sm">
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
        </dl>

        {/* コメント */}
        <div className="border-t border-gray-100 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-gray-600">
            コメント {comments.length > 0 && `(${comments.length})`}
          </h3>

          <div className="mb-3 space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-gray-50 p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {nameById.get(c.author_id) ?? "不明なユーザー"}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {fmtDate(new Date(c.created_at).getTime())}
                  </span>
                  {c.author_id === myId && (
                    <button
                      onClick={() =>
                        delComment.mutate({ id: c.id, taskId: task.id })
                      }
                      title="削除"
                      className="ml-auto rounded p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
                  {c.body}
                </p>
              </div>
            ))}
            {comments.length === 0 && !commentsQ.isLoading && (
              <p className="py-2 text-center text-xs text-gray-400">
                まだコメントはありません。
              </p>
            )}
          </div>

          <form onSubmit={submit} className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="コメントを書く…"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={addComment.isPending || !body.trim()}
              className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          {error && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          共有された閲覧専用ビューのため、予定は編集できません。
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
      <dt className="w-16 shrink-0 text-xs text-gray-400">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-gray-700">
        {children}
      </dd>
    </div>
  );
}
