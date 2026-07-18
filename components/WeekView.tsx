"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { buildRange, nowMs, fmtTimeRange, DAY } from "@/lib/calendar";
import { CAL_START_HOUR, CAL_END_HOUR } from "@/lib/config";
import { useMoveTask } from "@/lib/queries";
import {
  paletteFor,
  hatchBackground,
  type Task,
  type TaskDependency,
} from "@/lib/types";
import { ZoomIn, ZoomOut } from "lucide-react";

const GUTTER = 56;
const HOUR_PX_MIN = 28;
const HOUR_PX_MAX = 112;
const HOUR_PX_STEP = 14;
const HOUR_PX_DEFAULT = 56;
const HOUR_PX_KEY = "labocale.calHourPx";

interface Positioned {
  task: Task;
  dayIndex: number;
  startMs: number; // タスク全体の開始
  endMs: number; // タスク全体の終了
  top: number;
  height: number;
  continuesFromPrev: boolean; // 前日から続いている
  continuesToNext: boolean; // 翌日へ続く
}

interface LaidOut extends Positioned {
  cascadeIndex: number; // 重なりグループ内での順番（0=最背面/左端）
  cascadeCount: number; // その重なりグループのタスク数
  isBackground: boolean; // 待機/培養（is_wait）は幅を細めず最背面に固定
}

/**
 * 同じ日の中で時間帯が重なるタスクを検出する。実験操作の予定は横並びで
 * 細くはせず、サイズはほぼ固定のまま少しずつ右へずらして重ねる（左上が
 * 見えるので見逃さない）。待機/培養(is_wait)は幅を細めず必ず最背面に置く。
 */
function layoutDay(items: Positioned[]): LaidOut[] {
  const results: LaidOut[] = [];

  // 待機/培養は重なり計算に含めず、幅いっぱい・最背面のまま
  for (const it of items) {
    if (it.task.is_wait) {
      results.push({
        ...it,
        cascadeIndex: 0,
        cascadeCount: 1,
        isBackground: true,
      });
    }
  }

  // 実験操作のみカスケード（ずらし重ね）の対象
  const foreground = items
    .filter((it) => !it.task.is_wait)
    .sort((a, b) => a.top - b.top || b.height - a.height);

  let group: Positioned[] = [];
  let groupMaxEnd = -Infinity;

  function flushGroup() {
    if (group.length === 0) return;
    const cascadeCount = group.length;
    group.forEach((it, i) => {
      results.push({
        ...it,
        cascadeIndex: i,
        cascadeCount,
        isBackground: false,
      });
    });
    group = [];
    groupMaxEnd = -Infinity;
  }

  for (const item of foreground) {
    if (group.length > 0 && item.top >= groupMaxEnd) flushGroup();
    group.push(item);
    groupMaxEnd = Math.max(groupMaxEnd, item.top + item.height);
  }
  flushGroup();

  return results;
}

export function WeekView({
  refMs,
  tasks,
  deps,
  expColorById,
  equipNameById,
  selectedExperiment,
  visibleDays,
  weekStartsOn,
  workStartHour,
  workEndHour,
  onTaskClick,
  onCreateAt,
}: {
  refMs: number;
  tasks: Task[];
  deps: TaskDependency[];
  expColorById: Map<string, string>;
  equipNameById: Map<string, string>;
  selectedExperiment: string | null;
  visibleDays: number;
  weekStartsOn: 0 | 1;
  workStartHour: number;
  workEndHour: number;
  onTaskClick: (t: Task) => void;
  onCreateAt: (startMs: number) => void;
}) {
  const moveTask = useMoveTask();
  const gridRef = useRef<HTMLDivElement>(null);
  const [draftEnd, setDraftEnd] = useState<{ id: string; endMs: number } | null>(
    null,
  );

  // 表示の拡大・縮小（1時間あたりの高さ px）。localStorage に保存して次回も維持する。
  const [hourPx, setHourPx] = useState(HOUR_PX_DEFAULT);
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(HOUR_PX_KEY));
    if (stored >= HOUR_PX_MIN && stored <= HOUR_PX_MAX) setHourPx(stored);
  }, []);
  function zoom(delta: number) {
    setHourPx((h) => {
      const next = Math.min(
        HOUR_PX_MAX,
        Math.max(HOUR_PX_MIN, h + delta),
      );
      window.localStorage.setItem(HOUR_PX_KEY, String(next));
      return next;
    });
  }
  const TOTAL_H = (CAL_END_HOUR - CAL_START_HOUR) * hourPx;
  const resizing = useRef<{
    id: string;
    startY: number;
    origEnd: number;
    startMs: number;
  } | null>(null);

  const cells = buildRange(refMs, nowMs(), visibleDays, weekStartsOn);
  const dayCount = cells.length;
  const weekStart = cells[0].startMs;
  const weekEnd = cells[dayCount - 1].startMs + DAY;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // 週内タスクを配置情報に変換（日をまたぐ予定は日ごとのセグメントに分割）
  const positioned: Positioned[] = [];
  for (const task of tasks) {
    const s = new Date(task.start_time).getTime();
    const e =
      draftEnd?.id === task.id
        ? draftEnd.endMs
        : new Date(task.end_time).getTime();
    if (s >= weekEnd || e <= weekStart) continue;

    for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
      const dayStart = cells[dayIndex].startMs;
      const dayEnd = dayStart + DAY;
      const segStart = Math.max(s, dayStart);
      const segEnd = Math.min(e, dayEnd);
      if (segStart >= segEnd) continue; // この日には掛からない

      const topMin = (segStart - dayStart) / 60000 - CAL_START_HOUR * 60;
      const durMin = (segEnd - segStart) / 60000;
      let top = (topMin / 60) * hourPx;
      let height = (durMin / 60) * hourPx;
      if (top < 0) {
        height += top;
        top = 0;
      }
      if (top + height > TOTAL_H) height = TOTAL_H - top;
      if (height <= 0) continue;
      height = Math.max(height, 18);

      positioned.push({
        task,
        dayIndex,
        startMs: s,
        endMs: e,
        top,
        height,
        continuesFromPrev: segStart > s, // その日の頭が実際の開始より後 = 前日から継続
        continuesToNext: segEnd < e, // その日の末尾が実際の終了より前 = 翌日へ継続
      });
    }
  }

  function colWidth(): number {
    const w = gridRef.current?.clientWidth ?? 0;
    return (w - GUTTER) / dayCount;
  }

  // 空き枠クリック → クリック位置の時刻(30分スナップ)で新規予定
  function onColumnClick(dayStartMs: number, e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snapped = Math.floor((y / hourPx) * 60 / 30) * 30; // 分（グリッド先頭から）
    let startMin = CAL_START_HOUR * 60 + snapped;
    const maxStart = CAL_END_HOUR * 60 - 60; // 1時間の予定が収まるよう制限
    startMin = Math.max(CAL_START_HOUR * 60, Math.min(startMin, maxStart));
    onCreateAt(dayStartMs + startMin * 60000);
  }

  function onDragEnd(ev: DragEndEvent) {
    // セグメント id は `${taskId}__${dayIndex}` 形式
    const id = String(ev.active.id).split("__")[0];
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const cw = colWidth();
    const deltaDays = cw > 0 ? Math.round(ev.delta.x / cw) : 0;
    const deltaMin = Math.round(ev.delta.y / hourPx * 60 / 15) * 15;
    if (deltaDays === 0 && deltaMin === 0) return;
    const s = new Date(task.start_time).getTime();
    const dur = new Date(task.end_time).getTime() - s;
    const ns = s + deltaDays * DAY + deltaMin * 60000;
    moveTask.mutate({
      id,
      start_time: new Date(ns).toISOString(),
      end_time: new Date(ns + dur).toISOString(),
    });
  }

  function startResize(task: Task, e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const s = new Date(task.start_time).getTime();
    resizing.current = {
      id: task.id,
      startY: e.clientY,
      origEnd: new Date(task.end_time).getTime(),
      startMs: s,
    };
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeUp);
  }
  function onResizeMove(e: PointerEvent) {
    const r = resizing.current;
    if (!r) return;
    const deltaMin = Math.round((e.clientY - r.startY) / hourPx * 60 / 15) * 15;
    const newEnd = Math.max(r.startMs + 15 * 60000, r.origEnd + deltaMin * 60000);
    setDraftEnd({ id: r.id, endMs: newEnd });
  }
  function onResizeUp() {
    const r = resizing.current;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeUp);
    if (r && draftEndRef.current) {
      moveTask.mutate({
        id: r.id,
        start_time: new Date(r.startMs).toISOString(),
        end_time: new Date(draftEndRef.current.endMs).toISOString(),
      });
    }
    resizing.current = null;
    setDraftEnd(null);
  }
  // draftEnd を ref にミラー（イベントハンドラ内で最新値を参照）
  const draftEndRef = useRef(draftEnd);
  draftEndRef.current = draftEnd;

  const hours: number[] = [];
  for (let h = CAL_START_HOUR; h <= CAL_END_HOUR; h++) hours.push(h);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* 拡大・縮小コントロール */}
      <div className="absolute right-2 top-1.5 z-10 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white/95 p-0.5 shadow-sm">
        <button
          onClick={() => zoom(-HOUR_PX_STEP)}
          disabled={hourPx <= HOUR_PX_MIN}
          title="縮小（0時〜24時を見やすく）"
          className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => zoom(HOUR_PX_STEP)}
          disabled={hourPx >= HOUR_PX_MAX}
          title="拡大"
          className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div
        className="grid border-b border-gray-200"
        style={{
          gridTemplateColumns: `${GUTTER}px repeat(${dayCount}, minmax(0,1fr))`,
        }}
      >
        <div />
        {cells.map((c) => (
          <div
            key={c.index}
            className={`py-2 text-center ${c.isWeekend ? "bg-gray-50/60" : ""}`}
          >
            <div className="text-xs text-gray-400">{c.weekdayJp}</div>
            <div
              className={`mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                c.isToday ? "bg-brand-500 text-white" : "text-gray-700"
              }`}
            >
              {c.dateNum}
            </div>
          </div>
        ))}
      </div>

      {/* 本体（スクロール） */}
      <div className="thin-scroll flex-1 overflow-y-auto">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div
            ref={gridRef}
            className="grid"
            style={{
              gridTemplateColumns: `${GUTTER}px repeat(${dayCount}, minmax(0,1fr))`,
            }}
          >
            {/* 時間ラベル列（活動時間の開始/終了は強調） */}
            <div className="relative" style={{ height: TOTAL_H }}>
              {hours.map((h, i) => {
                const isWorkEdge = h === workStartHour || h === workEndHour;
                return (
                  <div
                    key={h}
                    className={`absolute right-2 -translate-y-1/2 text-xs ${
                      isWorkEdge
                        ? "font-bold text-brand-600"
                        : "text-gray-400"
                    }`}
                    style={{ top: i * hourPx }}
                  >
                    {i === 0 ? "" : `${h}:00`}
                  </div>
                );
              })}
            </div>

            {/* 各曜日カラム */}
            {cells.map((c) => {
              const dayItems = positioned.filter(
                (p) => p.dayIndex === c.index,
              );
              const laidOut = layoutDay(dayItems);
              return (
                <div
                  key={c.index}
                  onClick={(e) => onColumnClick(c.startMs, e)}
                  title="クリックで予定を追加"
                  className={`relative cursor-pointer border-l border-gray-200 ${
                    c.isWeekend ? "bg-gray-50/40" : ""
                  }`}
                  style={{ height: TOTAL_H }}
                >
                  {/* 時間グリッド線 */}
                  {hours.slice(0, -1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-b border-gray-200"
                      style={{ top: (i + 1) * hourPx, height: 0 }}
                    />
                  ))}

                  {/* 通常の活動時間の境界（太い横線） */}
                  {[workStartHour, workEndHour].map((wh) => (
                    <div
                      key={`work-${wh}`}
                      className="pointer-events-none absolute inset-x-0 border-t-2 border-brand-400"
                      style={{ top: (wh - CAL_START_HOUR) * hourPx }}
                    />
                  ))}

                  {/* タスク（日ごとのセグメント。時間が重なるものは横に並べる） */}
                  {laidOut.map((p) => (
                    <TaskBlock
                      key={`${p.task.id}__${p.dayIndex}`}
                      dndId={`${p.task.id}__${p.dayIndex}`}
                      p={p}
                      color={
                        p.task.experiment_id
                          ? expColorById.get(p.task.experiment_id) ?? "teal"
                          : "teal"
                      }
                      equipmentName={
                        p.task.equipment_id
                          ? equipNameById.get(p.task.equipment_id) ?? null
                          : null
                      }
                      dimmed={
                        !!selectedExperiment &&
                        p.task.experiment_id !== selectedExperiment
                      }
                      onClick={() => onTaskClick(p.task)}
                      onResizeStart={(e) => startResize(p.task, e)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}

function TaskBlock({
  dndId,
  p,
  color,
  equipmentName,
  dimmed,
  onClick,
  onResizeStart,
}: {
  dndId: string;
  p: LaidOut;
  color: string;
  equipmentName: string | null;
  dimmed: boolean;
  onClick: () => void;
  onResizeStart: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: dndId });
  const pal = paletteFor(color);
  const isWait = p.task.is_wait;
  const done = p.task.status === "done";
  const failed = p.task.status === "failed";

  // 待機/培養は幅いっぱい・最背面。実験操作は固定幅のまま右へずらして重ねる
  const isBackground = p.isBackground ?? false;
  const cascadeCount = isBackground ? 1 : p.cascadeCount ?? 1;
  const cascadeIndex = isBackground ? 0 : p.cascadeIndex ?? 0;
  const STEP = 16; // 1段ごとのずらし幅(px)
  const reserve = (cascadeCount - 1) * STEP; // グループ全体で確保するずらし幅

  const style: React.CSSProperties = {
    top: p.top,
    height: p.height,
    left: `calc(${cascadeIndex * STEP}px + 2px)`,
    width: `calc(100% - ${reserve}px - 4px)`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    // 待機/培養は最背面(0)、実験操作は前面(後段ほど手前)
    zIndex: isDragging ? 50 : isBackground ? 0 : cascadeIndex + 1,
    // 待機/培養ブロックはカレンダー色に沿った斜線塗り
    backgroundImage: isWait ? hatchBackground(color) : undefined,
    // 継続する側の角を丸めない（日をまたぐ連続表示）
    borderTopLeftRadius: p.continuesFromPrev ? 0 : undefined,
    borderTopRightRadius: p.continuesFromPrev ? 0 : undefined,
    borderBottomLeftRadius: p.continuesToNext ? 0 : undefined,
    borderBottomRightRadius: p.continuesToNext ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group absolute cursor-grab overflow-hidden rounded-lg border px-1.5 py-1 text-left shadow-sm transition active:cursor-grabbing ${
        isWait ? `bg-white ${pal.border}` : `${pal.bg} ${pal.border}`
      } ${dimmed ? "opacity-35" : ""} ${
        failed ? "ring-2 ring-rose-400" : ""
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <div
        className={`text-[11px] font-semibold leading-tight sm:text-xs ${pal.text} ${done ? "line-through opacity-60" : ""}`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: p.height > 46 ? 2 : 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {p.continuesFromPrev && <span className="text-gray-400">↑ </span>}
        {p.task.title}
      </div>
      {p.height > 32 && (
        <div className="truncate text-[10px] leading-tight text-gray-500">
          {p.task.subtitle ?? fmtTimeRange(p.startMs, p.endMs)}
        </div>
      )}
      {p.continuesToNext && (
        <div className="absolute bottom-0.5 right-1 text-[10px] text-gray-400">
          翌日へ ↓
        </div>
      )}
      {equipmentName && p.height > 52 && !p.continuesToNext && (
        <span className="mt-1 inline-block whitespace-nowrap rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
          {equipmentName}予約
        </span>
      )}

      {/* リサイズハンドル（実際の終了があるセグメントのみ） */}
      {!p.continuesToNext && (
        <div
          onPointerDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
        >
          <div className="mx-auto h-1 w-6 translate-y-0.5 rounded-full bg-gray-400/60" />
        </div>
      )}
    </div>
  );
}
