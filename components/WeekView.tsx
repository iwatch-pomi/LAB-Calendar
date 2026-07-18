"use client";

import { useRef, useState } from "react";
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
import { paletteFor, type Task, type TaskDependency } from "@/lib/types";

const HOUR_PX = 56;
const GUTTER = 56;
const TOTAL_H = (CAL_END_HOUR - CAL_START_HOUR) * HOUR_PX;

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

export function WeekView({
  refMs,
  tasks,
  deps,
  expColorById,
  equipNameById,
  selectedExperiment,
  visibleDays,
  weekStartsOn,
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
  onTaskClick: (t: Task) => void;
  onCreateAt: (startMs: number) => void;
}) {
  const moveTask = useMoveTask();
  const gridRef = useRef<HTMLDivElement>(null);
  const [draftEnd, setDraftEnd] = useState<{ id: string; endMs: number } | null>(
    null,
  );
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
      let top = (topMin / 60) * HOUR_PX;
      let height = (durMin / 60) * HOUR_PX;
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
    const snapped = Math.floor((y / HOUR_PX) * 60 / 30) * 30; // 分（グリッド先頭から）
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
    const deltaMin = Math.round(ev.delta.y / HOUR_PX * 60 / 15) * 15;
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
    const deltaMin = Math.round((e.clientY - r.startY) / HOUR_PX * 60 / 15) * 15;
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
            {/* 時間ラベル列 */}
            <div className="relative" style={{ height: TOTAL_H }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-xs text-gray-400"
                  style={{ top: i * HOUR_PX }}
                >
                  {i === 0 ? "" : `${h}:00`}
                </div>
              ))}
            </div>

            {/* 各曜日カラム */}
            {cells.map((c) => (
              <div
                key={c.index}
                onClick={(e) => onColumnClick(c.startMs, e)}
                title="クリックで予定を追加"
                className={`relative cursor-pointer border-l border-gray-100 ${
                  c.isWeekend ? "bg-gray-50/40" : ""
                }`}
                style={{ height: TOTAL_H }}
              >
                {/* 時間グリッド線 */}
                {hours.slice(0, -1).map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-b border-gray-100"
                    style={{ top: (i + 1) * HOUR_PX, height: 0 }}
                  />
                ))}

                {/* タスク（日ごとのセグメント） */}
                {positioned
                  .filter((p) => p.dayIndex === c.index)
                  .map((p) => (
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
            ))}
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
  p: Positioned;
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

  const style: React.CSSProperties = {
    top: p.top,
    height: p.height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 40 : undefined,
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
      className={`group absolute inset-x-0.5 cursor-grab overflow-hidden rounded-lg border px-1.5 py-1 text-left shadow-sm transition active:cursor-grabbing ${
        isWait
          ? "wait-hatch border-amber-300"
          : `${pal.bg} ${pal.border}`
      } ${dimmed ? "opacity-35" : ""} ${
        failed ? "ring-2 ring-rose-400" : ""
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <div
        className={`text-[11px] font-semibold leading-tight sm:text-xs ${
          isWait ? "text-amber-800" : pal.text
        } ${done ? "line-through opacity-60" : ""}`}
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
