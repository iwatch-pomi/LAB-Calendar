"use client";

import { useMemo, useState } from "react";
import {
  useUpdateTask,
  useDeleteTask,
  useAddDependency,
  useRemoveDependency,
} from "@/lib/queries";
import { isoToJstInput, jstInputToISO } from "@/lib/calendar";
import {
  paletteFor,
  type Equipment,
  type Experiment,
  type Task,
  type TaskDependency,
} from "@/lib/types";
import { X, Trash2, Link2, Plus, AlertTriangle, Check } from "lucide-react";

export function TaskModal({
  task,
  tasks,
  deps,
  experiments,
  equipment,
  onClose,
  onMarkFailed,
}: {
  task: Task;
  tasks: Task[];
  deps: TaskDependency[];
  experiments: Experiment[];
  equipment: Equipment[];
  onClose: () => void;
  onMarkFailed: (t: Task) => void;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addDep = useAddDependency();
  const removeDep = useRemoveDependency();

  const [title, setTitle] = useState(task.title);
  const [addingPred, setAddingPred] = useState(false);
  const [startInput, setStartInput] = useState(() =>
    isoToJstInput(task.start_time),
  );
  const [endInput, setEndInput] = useState(() => isoToJstInput(task.end_time));
  const [timeError, setTimeError] = useState<string | null>(null);

  const exp = experiments.find((e) => e.id === task.experiment_id);
  const pal = paletteFor(exp?.color ?? "teal");
  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks],
  );

  const predecessors = deps.filter((d) => d.successor_id === task.id);
  const successors = deps.filter((d) => d.predecessor_id === task.id);

  // 先行に選べる候補（自分・既存先行・後続を除く）
  const predIds = new Set(predecessors.map((d) => d.predecessor_id));
  const succIds = new Set(successors.map((d) => d.successor_id));
  const candidates = tasks.filter(
    (t) => t.id !== task.id && !predIds.has(t.id) && !succIds.has(t.id),
  );

  function saveTitle() {
    if (title.trim() && title !== task.title) {
      updateTask.mutate({ id: task.id, title: title.trim() });
    }
  }

  function commitTime(nextStart: string, nextEnd: string) {
    const startISO = jstInputToISO(nextStart);
    const endISO = jstInputToISO(nextEnd);
    if (!startISO || !endISO) {
      setTimeError("日時の形式が正しくありません。");
      return;
    }
    if (new Date(endISO).getTime() <= new Date(startISO).getTime()) {
      setTimeError("終了は開始より後にしてください。");
      return;
    }
    setTimeError(null);
    const changed =
      new Date(startISO).getTime() !== new Date(task.start_time).getTime() ||
      new Date(endISO).getTime() !== new Date(task.end_time).getTime();
    if (changed) {
      updateTask.mutate({
        id: task.id,
        start_time: startISO,
        end_time: endISO,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`flex items-center gap-2 rounded-t-2xl px-4 py-3 ${pal.bg}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${pal.dot}`} />
          <span className="text-xs font-medium text-gray-600">
            {exp?.name ?? "単発の予定"}
          </span>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-gray-500 hover:bg-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* タイトル */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="w-full border-b border-transparent pb-1 text-lg font-bold text-gray-800 outline-none focus:border-gray-300"
          />

          {/* 日時（手動編集・日をまたぐ変更も可） */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">日時</label>
              {task.is_wait && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  待機ブロック
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-[11px] text-gray-500">
                開始
                <input
                  type="datetime-local"
                  value={startInput}
                  onChange={(e) => {
                    setStartInput(e.target.value);
                    commitTime(e.target.value, endInput);
                  }}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                終了
                <input
                  type="datetime-local"
                  value={endInput}
                  onChange={(e) => {
                    setEndInput(e.target.value);
                    commitTime(startInput, e.target.value);
                  }}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            </div>
            {timeError && (
              <p className="mt-1 text-xs text-rose-500">{timeError}</p>
            )}
          </div>

          {/* 装置 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              使用装置
            </label>
            <select
              value={task.equipment_id ?? ""}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  equipment_id: e.target.value || null,
                  needs_reservation: !!e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">なし</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* 先行タスク（依存関係） */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-brand-600" />
              <span className="text-xs font-semibold text-gray-500">
                前提タスク（これらの後に実行）
              </span>
            </div>
            <div className="space-y-1">
              {predecessors.length === 0 && !addingPred && (
                <p className="text-xs text-gray-400">なし</p>
              )}
              {predecessors.map((d) => {
                const pt = taskById.get(d.predecessor_id);
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex-1 truncate text-gray-700">
                      {pt?.title ?? "（削除済み）"}
                    </span>
                    <button
                      onClick={() => removeDep.mutate(d.id)}
                      className="text-gray-400 hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {addingPred ? (
                <select
                  autoFocus
                  onChange={(e) => {
                    if (e.target.value) {
                      addDep.mutate({
                        predecessor_id: e.target.value,
                        successor_id: task.id,
                      });
                    }
                    setAddingPred(false);
                  }}
                  onBlur={() => setAddingPred(false)}
                  defaultValue=""
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="" disabled>
                    前提タスクを選択…
                  </option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setAddingPred(true)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  前提を追加
                </button>
              )}
            </div>
          </div>

          {/* アクション */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            {task.status === "done" ? (
              <button
                onClick={() =>
                  updateTask.mutate({ id: task.id, status: "planned" })
                }
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                <Check className="h-4 w-4" />
                完了を取消
              </button>
            ) : (
              <button
                onClick={() =>
                  updateTask.mutate({ id: task.id, status: "done" })
                }
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                <Check className="h-4 w-4" />
                完了にする
              </button>
            )}

            <button
              onClick={() => onMarkFailed(task)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
            >
              <AlertTriangle className="h-4 w-4" />
              失敗 → 自動リスケ
            </button>

            <button
              onClick={() => {
                deleteTask.mutate(task.id);
                onClose();
              }}
              className="ml-auto rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-rose-500"
              title="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
