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
import {
  buildWeek,
  nowMs,
  minutesFromMidnight,
  tokyoMidnightMs,
  fmtTimeRange,
  DAY,
} from "@/lib/calendar";
import { CAL_START_HOUR, CAL_END_HOUR } from "@/lib/config";
import { useMoveTask } from "@/lib/queries";
import { paletteFor, type Task, type TaskDependency } from "@/lib/types";

const HOUR_PX = 56;
const GUTTER = 56;
const TOTAL_H = (CAL_END_HOUR - CAL_START_HOUR) * HOUR_PX;

interface Positioned {
  task: Task;
  dayIndex: number;
  startMs: number;
  endMs: number;
  top: number;
  height: number;
}

export function WeekView({
  refMs,
  tasks,
  deps,
  expColorById,
  equipNameById,
  selectedExperiment,
  highlightIds,
  onTaskClick,
}: {
  refMs: number;
  tasks: Task[];
  deps: TaskDependency[];
  expColorById: Map<string, string>;
  equipNameById: Map<string, string>;
  selectedExperiment: string | null;
  highlightIds: string[];
  onTaskClick: (t: Task) => void;
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

  const cells = buildWeek(refMs, nowMs());
  const weekStart = cells[0].startMs;
  const weekEnd = cells[6].startMs + DAY;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // 週内タスクを配置情報に変換
  const positioned: Positioned[] = [];
  for (const task of tasks) {
    const s = new Date(task.start_time).getTime();
    const e = new Date(task.end_time).getTime();
    if (s >= weekEnd || e <= weekStart) continue;
    const dayIndex = Math.floor((tokyoMidnightMs(s) - weekStart) / DAY);
    if (dayIndex < 0 || dayIndex > 6) continue;
    const endMs = draftEnd?.id === task.id ? draftEnd.endMs : e;
    const topMin = minutesFromMidnight(s) - CAL_START_HOUR * 60;
    const durMin = (endMs - s) / 60000;
    let top = (topMin / 60) * HOUR_PX;
    let height = (durMin / 60) * HOUR_PX;
    if (top < 0) {
      height += top;
      top = 0;
    }
    if (top + height > TOTAL_H) height = TOTAL_H - top;
    height = Math.max(height, 18);
    positioned.push({ task, dayIndex, startMs: s, endMs, top, height });
  }

  function colWidth(): number {
    const w = gridRef.current?.clientWidth ?? 0;
    return (w - GUTTER) / 7;
  }

  function onDragEnd(ev: DragEndEvent) {
    const id = String(ev.active.id);
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
        style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0,1fr))` }}
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
              gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0,1fr))`,
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
                className={`relative border-l border-gray-100 ${
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

                {/* タスク */}
                {positioned
                  .filter((p) => p.dayIndex === c.index)
                  .map((p) => (
                    <TaskBlock
                      key={p.task.id}
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
                      highlighted={highlightIds.includes(p.task.id)}
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
  p,
  color,
  equipmentName,
  dimmed,
  highlighted,
  onClick,
  onResizeStart,
}: {
  p: Positioned;
  color: string;
  equipmentName: string | null;
  dimmed: boolean;
  highlighted: boolean;
  onClick: () => void;
  onResizeStart: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: p.task.id });
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`group absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition active:cursor-grabbing ${
        isWait
          ? "wait-hatch border-amber-300"
          : `${pal.bg} ${pal.border}`
      } ${dimmed ? "opacity-35" : ""} ${
        failed ? "ring-2 ring-rose-400" : ""
      } ${highlighted ? "animate-pulse-move ring-2 ring-brand-400" : ""} ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div
        className={`truncate text-xs font-semibold ${
          isWait ? "text-amber-800" : pal.text
        } ${done ? "line-through opacity-60" : ""}`}
      >
        {p.task.title}
      </div>
      {p.height > 34 && (
        <div className="truncate text-[11px] text-gray-500">
          {p.task.subtitle ?? fmtTimeRange(p.startMs, p.endMs)}
        </div>
      )}
      {equipmentName && p.height > 48 && (
        <span className="mt-1 inline-block rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
          {equipmentName}予約
        </span>
      )}

      {/* リサイズハンドル */}
      <div
        onPointerDown={onResizeStart}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
      >
        <div className="mx-auto h-1 w-6 translate-y-0.5 rounded-full bg-gray-400/60" />
      </div>
    </div>
  );
}
