"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import {
  paletteFor,
  PALETTE_KEYS,
  type Experiment,
  type Todo,
} from "@/lib/types";
import {
  useToggleTodo,
  useAddTodo,
  useDeleteTodo,
  useUpdateTodo,
  useUpdateExperiment,
  useDeleteExperiment,
  useSettings,
} from "@/lib/queries";
import { useCreateEmptyExperiment } from "@/lib/mutations";
import { fmtTime, jstInputToISO, isoToJstInput } from "@/lib/calendar";
import {
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Archive,
  Info,
  Sprout,
} from "lucide-react";

export function Sidebar({
  experiments,
  todos,
  selectedExperiment,
  onSelectExperiment,
  onClose,
  userEmail,
}: {
  experiments: Experiment[];
  todos: Todo[];
  selectedExperiment: string | null;
  onSelectExperiment: (id: string | null) => void;
  onClose: () => void;
  userEmail: string;
}) {
  const toggleTodo = useToggleTodo();
  const addTodo = useAddTodo();
  const deleteTodo = useDeleteTodo();
  const updateTodo = useUpdateTodo();
  const createExperiment = useCreateEmptyExperiment();
  const updateExperiment = useUpdateExperiment();
  const deleteExperiment = useDeleteExperiment();
  const features = useSettings().data ?? {};
  const [newTodo, setNewTodo] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);

  // 実験のインライン登録
  const [regOpen, setRegOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regColor, setRegColor] = useState<string>(PALETTE_KEYS[0]);

  function submitExperiment() {
    if (regName.trim()) {
      createExperiment.mutate({ name: regName.trim(), color: regColor });
    }
    setRegName("");
    setRegColor(PALETTE_KEYS[0]);
    setRegOpen(false);
  }

  // 実験のインライン編集
  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [editExpName, setEditExpName] = useState("");
  const [editExpColor, setEditExpColor] = useState<string>(PALETTE_KEYS[0]);

  function startEditExperiment(exp: Experiment) {
    setEditExpId(exp.id);
    setEditExpName(exp.name);
    setEditExpColor(exp.color);
  }

  function saveEditExperiment() {
    if (editExpId && editExpName.trim()) {
      updateExperiment.mutate({
        id: editExpId,
        name: editExpName.trim(),
        color: editExpColor,
      });
    }
    setEditExpId(null);
  }

  function handleArchiveExperiment(exp: Experiment) {
    if (selectedExperiment === exp.id) onSelectExperiment(null);
    updateExperiment.mutate({ id: exp.id, archived: true });
  }

  function handleDeleteExperiment(exp: Experiment) {
    if (
      confirm(
        `実験「${exp.name}」を完全に削除しますか？\nこの実験に紐づく予定もすべて削除され、元に戻せません。\n（削除せずアーカイブする場合は、隣のアーカイブボタンをお使いください）`,
      )
    ) {
      if (selectedExperiment === exp.id) onSelectExperiment(null);
      deleteExperiment.mutate(exp.id);
    }
  }

  // 編集中の ToDo
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

  function startEdit(todo: Todo) {
    setEditId(todo.id);
    setEditTitle(todo.title);
    setEditDue(todo.due_at ? isoToJstInput(todo.due_at) : "");
  }

  function saveEdit() {
    if (editId && editTitle.trim()) {
      updateTodo.mutate({
        id: editId,
        title: editTitle.trim(),
        due_at: jstInputToISO(editDue),
      });
    }
    setEditId(null);
  }

  // 編集画面の外側をクリックしたら、保存せずに閉じる
  const editFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!editId) return;
    function handleOutside(e: MouseEvent) {
      if (editFormRef.current && !editFormRef.current.contains(e.target as Node)) {
        setEditId(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [editId]);

  function submitTodo() {
    if (newTodo.trim()) {
      addTodo.mutate({
        title: newTodo.trim(),
        sort_order: todos.length,
        due_at: jstInputToISO(newDue),
      });
    }
    setNewTodo("");
    setNewDue("");
    setAdding(false);
  }

  // アーカイブした実験はサイドバーから隠す（マイページで確認・復元できる）
  const visibleExperiments = experiments.filter((e) => !e.archived);

  // 完了から24時間経過したToDoはサイドバーから隠す（マイページの完了履歴で確認可能）
  const visibleTodos = todos.filter((t) => {
    if (!t.done || !t.completed_at) return true;
    const elapsed = Date.now() - new Date(t.completed_at).getTime();
    return elapsed < 24 * 60 * 60 * 1000;
  });
  const doneCount = visibleTodos.filter((t) => t.done).length;

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-4">
        <Link
          href="/profile"
          title="プロフィール（過去の実験）"
          className="rounded-lg transition hover:opacity-80"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            title="サイドバーを閉じる"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-4">
        {/* カレンダー一覧 */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500">カレンダー一覧</h2>
          <span className="text-xs text-gray-400">
            {visibleExperiments.length}
          </span>
        </div>
        <div className="space-y-2">
          {visibleExperiments.map((exp) => {
            const p = paletteFor(exp.color);
            const active = selectedExperiment === exp.id;

            if (editExpId === exp.id) {
              return (
                <form
                  key={exp.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEditExperiment();
                  }}
                  className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/40 p-2.5"
                >
                  <input
                    autoFocus
                    value={editExpName}
                    onChange={(e) => setEditExpName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center gap-1.5">
                    {PALETTE_KEYS.map((k) => {
                      const kp = paletteFor(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditExpColor(k)}
                          className={`h-5 w-5 rounded-full ${kp.dot} ${
                            editExpColor === k
                              ? "ring-2 ring-gray-400 ring-offset-1"
                              : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditExpId(null)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={exp.id}
                className={`group relative w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? `${p.border} ${p.bg} ring-2 ring-offset-1 ${p.border}`
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <button
                  onClick={() => onSelectExperiment(active ? null : exp.id)}
                  className="block w-full pr-12 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
                    <span className="truncate text-sm font-semibold text-gray-800">
                      {exp.name}
                    </span>
                  </div>
                </button>
                <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => startEditExperiment(exp)}
                    title="編集"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchiveExperiment(exp)}
                    title="アーカイブ（マイページで確認・復元できます）"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-amber-600"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteExperiment(exp)}
                    title="完全に削除"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {regOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitExperiment();
            }}
            className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
          >
            <input
              autoFocus
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="カレンダー名（例: 大腸菌タンパク質発現）"
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <div className="flex items-center gap-1.5">
              {PALETTE_KEYS.map((k) => {
                const p = paletteFor(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRegColor(k)}
                    className={`h-5 w-5 rounded-full ${p.dot} ${
                      regColor === k
                        ? "ring-2 ring-gray-400 ring-offset-1"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                登録
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegOpen(false);
                  setRegName("");
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setRegOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 transition hover:border-brand-400 hover:text-brand-600"
          >
            <Plus className="h-4 w-4" />
            カレンダーを追加
          </button>
        )}

        {/* 継代培養を管理（生物実験モードON時のみ） */}
        {features.bio_culture_lineage && (
          <Link
            href="/culture"
            title="継代培養を管理（培地の作成・期限・系統）"
            className="mt-4 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Sprout className="h-4 w-4 text-emerald-600" />
            継代培養を管理
          </Link>
        )}

        {/* 今日の ToDo */}
        <div className="mb-1 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <h2 className="text-xs font-semibold text-gray-500">今日のToDo</h2>
            <span
              title="完了したToDoは、完了から1日経つとこの一覧から自動的に非表示になります。プロフィール画面の「完了したToDo」でいつでも確認・未完了に戻せます。"
              className="text-gray-300 hover:text-gray-500"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {doneCount}/{visibleTodos.length}
          </span>
        </div>
        <div className="space-y-1">
          {visibleTodos.map((todo) =>
            editId === todo.id ? (
              <form
                key={todo.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit();
                }}
                className="space-y-1.5 rounded-lg border border-brand-200 bg-brand-50/40 p-2"
              >
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="ToDo名"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
                <label className="block text-[11px] text-gray-500">
                  期日（任意）
                  <input
                    type="datetime-local"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
                  />
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    キャンセル
                  </button>
                  {editDue && (
                    <button
                      type="button"
                      onClick={() => setEditDue("")}
                      title="期日をクリア"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div
                key={todo.id}
                className="group flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-50"
              >
                <button
                  onClick={() =>
                    toggleTodo.mutate({ id: todo.id, done: !todo.done })
                  }
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition ${
                    todo.done
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {todo.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <button
                  onClick={() => startEdit(todo)}
                  title="クリックで編集"
                  className="min-w-0 flex-1 text-left"
                >
                  <div
                    className={`text-sm ${
                      todo.done ? "text-gray-400 line-through" : "text-gray-700"
                    }`}
                  >
                    {todo.title}
                  </div>
                  {todo.due_at && !todo.done && (
                    <div className="text-xs text-rose-500">
                      {dueLabel(todo.due_at)}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => deleteTodo.mutate(todo.id)}
                  title="削除"
                  className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition hover:bg-gray-200 hover:text-rose-500 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          )}

          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitTodo();
              }}
              className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50/60 p-2"
            >
              <input
                autoFocus
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="ToDoを入力…"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <label className="block text-[11px] text-gray-500">
                期日（任意）
                <input
                  type="datetime-local"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
                />
              </label>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewTodo("");
                    setNewDue("");
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-1.5 py-1.5 text-sm text-gray-400 transition hover:text-brand-600"
            >
              <Plus className="h-3.5 w-3.5" />
              ToDoを追加
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function dueLabel(iso: string): string {
  const ms = new Date(iso).getTime();
  const jst = new Date(ms + 540 * 60000);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}(${weekday}) ${fmtTime(ms)}まで`;
}
