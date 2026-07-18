"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useUpdateTask,
  useDeleteTask,
  useSettings,
  useCultureMedia,
  useAddCultureMedium,
} from "@/lib/queries";
import { isoToJstInput, jstInputToISO } from "@/lib/calendar";
import { cultureStatus, CULTURE_STATUS_META, fmtMd } from "@/lib/culture";
import {
  paletteFor,
  type Equipment,
  type Experiment,
  type Task,
  type TaskDependency,
  type TaskKind,
} from "@/lib/types";
import {
  X,
  Trash2,
  AlertTriangle,
  Check,
  Sprout,
  ArrowUpRight,
} from "lucide-react";

export function TaskModal({
  task,
  tasks,
  deps,
  experiments,
  equipment,
  onClose,
}: {
  task: Task;
  tasks: Task[];
  deps: TaskDependency[];
  experiments: Experiment[];
  equipment: Equipment[];
  onClose: () => void;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const settings = useSettings().data ?? {};
  const cultureMedia = useCultureMedia().data ?? [];
  const addCultureMedium = useAddCultureMedium();

  const [title, setTitle] = useState(task.title);
  const [startInput, setStartInput] = useState(() =>
    isoToJstInput(task.start_time),
  );
  const [endInput, setEndInput] = useState(() => isoToJstInput(task.end_time));
  const [timeError, setTimeError] = useState<string | null>(null);

  // 培地作成フォーム
  const [creatingMedium, setCreatingMedium] = useState(false);
  const [mediumName, setMediumName] = useState("");
  const [mediumExpiry, setMediumExpiry] = useState("");
  const [mediumParent, setMediumParent] = useState("");
  const [mediumError, setMediumError] = useState<string | null>(null);

  // 常に最新のタスク状態を参照（完了/装置変更などを即時反映）
  const liveTask = tasks.find((t) => t.id === task.id) ?? task;

  const exp = experiments.find((e) => e.id === task.experiment_id);
  const pal = paletteFor(exp?.color ?? "teal");

  // 種別: task_kind（培養時間のとき培地、実験操作のとき使用機器）
  const cultureEnabled = !!settings.bio_culture_lineage;
  const kind: TaskKind = liveTask.task_kind ?? (liveTask.is_wait ? "wait" : "operation");
  const linkedMedium = cultureMedia.find((m) => m.source_task_id === task.id);

  function setKind(next: TaskKind) {
    updateTask.mutate({
      id: task.id,
      task_kind: next,
      is_wait: next !== "operation",
    });
  }

  function submitMedium(e: React.FormEvent) {
    e.preventDefault();
    setMediumError(null);
    if (!mediumName.trim()) {
      setMediumError("培地名を入力してください。");
      return;
    }
    // タスク開始日(JST)を作成日の既定にする
    const createdDate = isoToJstInput(task.start_time).slice(0, 10);
    addCultureMedium.mutate({
      name: mediumName.trim(),
      created_date: createdDate,
      expiry_date: mediumExpiry || null,
      parent_id: mediumParent || null,
      source_task_id: task.id,
    });
    setMediumName("");
    setMediumExpiry("");
    setMediumParent("");
    setCreatingMedium(false);
  }

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
          {/* 種別（実験操作 / 待機時間 / 培養時間） */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              種別
            </label>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
              <button
                onClick={() => setKind("operation")}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
                  kind === "operation"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                実験操作
              </button>
              <button
                onClick={() => setKind("wait")}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
                  kind === "wait"
                    ? "bg-amber-100 text-amber-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                待機時間
              </button>
              {cultureEnabled && (
                <button
                  onClick={() => setKind("culture")}
                  className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
                    kind === "culture"
                      ? "bg-emerald-100 text-emerald-800 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  培養時間
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">日時</label>
              {liveTask.status === "done" && (
                <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                  完了済み
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

          {/* 使用機器（実験操作のみ） */}
          {kind === "operation" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                使用機器
              </label>
              <select
                value={liveTask.equipment_id ?? ""}
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
          )}

          {/* 培地（培養時間のとき・継代培養の記録ON） */}
          {kind === "culture" && cultureEnabled && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-gray-500">
                  培地
                </span>
              </div>

              {linkedMedium ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-sm ring-1 ring-emerald-100">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-800">
                      {linkedMedium.name}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {linkedMedium.expiry_date
                        ? `期限 ${fmtMd(linkedMedium.expiry_date)}`
                        : "期限なし"}
                    </span>
                  </span>
                  {(() => {
                    const st = CULTURE_STATUS_META[cultureStatus(linkedMedium)];
                    return (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    );
                  })()}
                  <Link
                    href="/culture"
                    title="培地管理ページで開く"
                    className="shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : creatingMedium ? (
                <form
                  onSubmit={submitMedium}
                  className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2"
                >
                  <input
                    autoFocus
                    value={mediumName}
                    onChange={(e) => setMediumName(e.target.value)}
                    placeholder="培地名（例: 大腸菌 前培養 LB）"
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <label className="block text-[11px] text-gray-500">
                    期限日（任意）
                    <input
                      type="date"
                      value={mediumExpiry}
                      onChange={(e) => setMediumExpiry(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-[11px] text-gray-500">
                    継代元（任意）
                    <select
                      value={mediumParent}
                      onChange={(e) => setMediumParent(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">なし</option>
                      {cultureMedia.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {mediumError && (
                    <p className="text-xs text-rose-500">{mediumError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      培地を作成
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingMedium(false);
                        setMediumError(null);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setMediumName(title.trim());
                    setCreatingMedium(true);
                  }}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                >
                  <Sprout className="h-3 w-3" />
                  この培養時間から培地を作成
                </button>
              )}
            </div>
          )}

          {/* アクション */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            {liveTask.status === "done" ? (
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

            {liveTask.status === "failed" ? (
              <button
                onClick={() =>
                  updateTask.mutate({ id: task.id, status: "planned" })
                }
                className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
              >
                <AlertTriangle className="h-4 w-4" />
                失敗を取消
              </button>
            ) : (
              <button
                onClick={() =>
                  updateTask.mutate({ id: task.id, status: "failed" })
                }
                className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
              >
                <AlertTriangle className="h-4 w-4" />
                失敗にする
              </button>
            )}

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
