"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { paletteFor, type Experiment, type Todo } from "@/lib/types";
import { useToggleTodo, useAddTodo } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { fmtTime } from "@/lib/calendar";
import { Plus, LogOut, Link2, Check } from "lucide-react";

const STATUS_LABEL: Record<Experiment["status"], string> = {
  planning: "未着手",
  in_progress: "進行中",
  done: "完了",
  failed: "要リスケ",
};

export function Sidebar({
  experiments,
  todos,
  selectedExperiment,
  onSelectExperiment,
  onOpenAddMenu,
  userEmail,
}: {
  experiments: Experiment[];
  todos: Todo[];
  selectedExperiment: string | null;
  onSelectExperiment: (id: string | null) => void;
  onOpenAddMenu: () => void;
  userEmail: string;
}) {
  const toggleTodo = useToggleTodo();
  const addTodo = useAddTodo();
  const [newTodo, setNewTodo] = useState("");
  const [adding, setAdding] = useState(false);

  const doneCount = todos.filter((t) => t.done).length;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-4">
        <Logo />
        <button
          onClick={signOut}
          title="ログアウト"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-4">
        {/* 登録した実験 */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500">登録した実験</h2>
          <span className="text-xs text-gray-400">{experiments.length}</span>
        </div>
        <div className="space-y-2">
          {experiments.map((exp) => {
            const p = paletteFor(exp.color);
            const active = selectedExperiment === exp.id;
            const progress =
              exp.total_steps > 0
                ? Math.round((exp.current_step / exp.total_steps) * 100)
                : 0;
            return (
              <button
                key={exp.id}
                onClick={() => onSelectExperiment(active ? null : exp.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? `${p.border} ${p.bg} ring-2 ring-offset-1 ${p.border}`
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                  <span className="truncate text-sm font-semibold text-gray-800">
                    {exp.name}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {STATUS_LABEL[exp.status]}
                  {exp.total_steps > 0 &&
                    `・${
                      exp.status === "planning"
                        ? `全${exp.total_steps}ステップ`
                        : `ステップ ${exp.current_step} / ${exp.total_steps}`
                    }`}
                </div>
                {exp.status === "in_progress" && exp.total_steps > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${p.dot}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenAddMenu}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 transition hover:border-brand-400 hover:text-brand-600"
        >
          <Plus className="h-4 w-4" />
          実験を登録
        </button>

        {/* 今日の ToDo */}
        <div className="mb-1 mt-6 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500">今日のToDo</h2>
          <span className="text-xs text-gray-400">
            {doneCount}/{todos.length}
          </span>
        </div>
        <div className="space-y-1">
          {todos.map((todo) => (
            <label
              key={todo.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-50"
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
              <div className="min-w-0">
                <div
                  className={`text-sm ${
                    todo.done
                      ? "text-gray-400 line-through"
                      : "text-gray-700"
                  }`}
                >
                  {todo.title}
                </div>
                {todo.due_at && !todo.done && (
                  <div className="text-xs text-rose-500">
                    {dueLabel(todo.due_at)}
                  </div>
                )}
              </div>
            </label>
          ))}

          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTodo.trim()) {
                  addTodo.mutate({
                    title: newTodo.trim(),
                    sort_order: todos.length,
                  });
                  setNewTodo("");
                }
                setAdding(false);
              }}
              className="px-1.5 py-1"
            >
              <input
                autoFocus
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onBlur={() => setAdding(false)}
                placeholder="ToDoを入力…"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
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

      {/* 依存関係リンク 説明 */}
      <div className="m-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
          <Link2 className="h-4 w-4" />
          依存関係リンク
        </div>
        <p className="mt-1 text-xs leading-relaxed text-brand-700/80">
          タスクをつなぐと、失敗時に後続を自動リスケします。
        </p>
      </div>
    </aside>
  );
}

function dueLabel(iso: string): string {
  const ms = new Date(iso).getTime();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][
    new Date(ms + 540 * 60000).getUTCDay()
  ];
  return `${weekday} ${fmtTime(ms)}まで`;
}
