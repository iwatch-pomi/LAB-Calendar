"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useExperiments,
  useTasks,
  useEquipment,
  useTodos,
  useUpdateExperiment,
  useSettings,
  useUpdateFeature,
  useCultureLinks,
  useAddCultureLink,
  useDeleteCultureLink,
  useAddEquipment,
  useDeleteEquipment,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { fmtTime } from "@/lib/calendar";
import {
  paletteFor,
  PALETTE_KEYS,
  type CultureLink,
  type Experiment,
  type Task,
} from "@/lib/types";
import {
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  RotateCcw,
  FlaskConical,
  Beaker,
  Calendar,
  Settings,
  GitBranch,
  Sprout,
  Plus,
  X,
  Download,
  Wrench,
  LogOut,
  ListChecks,
} from "lucide-react";

const STATUS_META: Record<
  Experiment["status"],
  { label: string; cls: string }
> = {
  planning: { label: "未着手", cls: "bg-gray-100 text-gray-500" },
  in_progress: { label: "進行中", cls: "bg-brand-100 text-brand-700" },
  done: { label: "完了", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "要リスケ", cls: "bg-rose-100 text-rose-600" },
};

const STATUS_ORDER: Record<Experiment["status"], number> = {
  done: 0,
  failed: 1,
  in_progress: 2,
  planning: 3,
};

type Filter = "all" | "done" | "in_progress";

function fmtDate(ms: number): string {
  const s = new Date(ms + 540 * 60000);
  return `${s.getUTCMonth() + 1}/${s.getUTCDate()}`;
}

/** CSV セルのエスケープ */
function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 行配列を CSV としてダウンロード（Excel 向けに UTF-8 BOM 付き） */
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfileView({ userEmail }: { userEmail: string }) {
  const experimentsQ = useExperiments();
  const tasksQ = useTasks();
  const equipmentQ = useEquipment();
  const todosQ = useTodos();
  const settingsQ = useSettings();
  const updateExp = useUpdateExperiment();
  const updateFeature = useUpdateFeature();
  const addEquipment = useAddEquipment();
  const deleteEquipment = useDeleteEquipment();

  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newEquip, setNewEquip] = useState("");

  const experiments = experimentsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const equipment = equipmentQ.data ?? [];
  const features = settingsQ.data ?? {};

  const completedTodos = (todosQ.data ?? [])
    .filter((t) => t.done)
    .sort((a, b) => {
      const at = a.completed_at ?? a.created_at;
      const bt = b.completed_at ?? b.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });

  const equipNameById = useMemo(
    () => new Map(equipment.map((e) => [e.id, e.name])),
    [equipment],
  );

  const tasksByExp = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.experiment_id) continue;
      if (!m.has(t.experiment_id)) m.set(t.experiment_id, []);
      m.get(t.experiment_id)!.push(t);
    }
    for (const arr of m.values())
      arr.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    return m;
  }, [tasks]);

  const doneCount = experiments.filter((e) => e.status === "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const filtered = experiments
    .filter((e) =>
      filter === "all"
        ? true
        : filter === "done"
          ? e.status === "done" || e.status === "failed"
          : e.status === "in_progress" || e.status === "planning",
    )
    .sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function signOut() {
    if (!confirm("ログアウトしますか？")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function submitEquipment() {
    const name = newEquip.trim();
    if (!name) return;
    if (equipment.some((e) => e.name === name)) {
      setNewEquip("");
      return;
    }
    addEquipment.mutate({
      name,
      color: PALETTE_KEYS[equipment.length % PALETTE_KEYS.length],
    });
    setNewEquip("");
  }

  const initial = (userEmail[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            カレンダーへ戻る
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        {/* プロフィール */}
        <section className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-sm">
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">マイプロフィール</h1>
            <p className="text-sm text-gray-500">{userEmail}</p>
          </div>
        </section>

        {/* 統計 */}
        <section className="mb-6 grid grid-cols-3 gap-3">
          <StatCard
            icon={<FlaskConical className="h-4 w-4" />}
            label="登録した実験"
            value={experiments.length}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="完了した実験"
            value={doneCount}
          />
          <StatCard
            icon={<Beaker className="h-4 w-4" />}
            label="完了タスク"
            value={doneTasks}
          />
        </section>

        {/* 完了したToDo（サイドバーでは完了から24時間で非表示） */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              完了したToDo
            </h2>
            <span className="text-xs text-gray-400">
              {completedTodos.length}
            </span>
          </div>
          {completedTodos.length === 0 ? (
            <p className="text-xs text-gray-400">
              完了したToDoはまだありません。
            </p>
          ) : (
            <ul className="space-y-1.5">
              {completedTodos.map((todo) => {
                const at = todo.completed_at ?? todo.created_at;
                const ms = new Date(at).getTime();
                return (
                  <li
                    key={todo.id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="flex-1 truncate text-gray-500 line-through">
                      {todo.title}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtDate(ms)} {fmtTime(ms)} 完了
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 設定: 個別機能の表示/非表示 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">設定</h2>
          </div>
          <FeatureToggle
            icon={<Sprout className="h-4 w-4 text-emerald-600" />}
            title="培養リネージュ記録"
            description="前培養・本培養・継代培養など培養ステップの前後関係（相関）をまとめて表示します。生物系の実験向け。"
            checked={!!features.culture_lineage}
            onChange={(v) =>
              updateFeature.mutate({ key: "culture_lineage", value: v })
            }
          />
        </section>

        {/* 使用機器の管理 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">使用機器</h2>
            <span className="text-xs text-gray-400">{equipment.length}</span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            予定に紐づけられる共通機器（遠心機・AKTA など）を登録します。削除しても過去の予定は残ります（機器の紐づけのみ外れます）。
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {equipment.length === 0 && (
              <span className="text-xs text-gray-400">
                まだ機器が登録されていません。
              </span>
            )}
            {equipment.map((eq) => {
              const pal = paletteFor(eq.color);
              return (
                <span
                  key={eq.id}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1.5 text-sm"
                >
                  <span className={`h-2 w-2 rounded-full ${pal.dot}`} />
                  <span className="text-gray-700">{eq.name}</span>
                  <button
                    onClick={() => deleteEquipment.mutate(eq.id)}
                    title="削除"
                    className="rounded-full p-0.5 text-gray-300 transition hover:bg-gray-200 hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitEquipment();
            }}
            className="flex gap-2"
          >
            <input
              value={newEquip}
              onChange={(e) => setNewEquip(e.target.value)}
              placeholder="機器名（例: サーマルサイクラー）"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </form>
        </section>

        {/* 培養リネージュ（機能ONのとき表示） */}
        {features.culture_lineage && (
          <CultureLineage experiments={experiments} tasks={tasks} />
        )}

        {/* フィルタ */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">実験の記録</h2>
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
            {(
              [
                ["all", "すべて"],
                ["done", "完了"],
                ["in_progress", "進行中"],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  filter === key
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 実験カード一覧 */}
        {experimentsQ.isLoading ? (
          <p className="py-10 text-center text-sm text-gray-400">読み込み中…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
            該当する実験がありません。
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((exp) => {
              const pal = paletteFor(exp.color);
              const expTasks = tasksByExp.get(exp.id) ?? [];
              const meta = STATUS_META[exp.status];
              const isOpen = expanded.has(exp.id);

              const starts = expTasks.map((t) =>
                new Date(t.start_time).getTime(),
              );
              const ends = expTasks.map((t) => new Date(t.end_time).getTime());
              const period =
                expTasks.length > 0
                  ? `${fmtDate(Math.min(...starts))} 〜 ${fmtDate(
                      Math.max(...ends),
                    )}`
                  : "予定なし";
              const usedEquip = Array.from(
                new Set(
                  expTasks
                    .map((t) =>
                      t.equipment_id
                        ? equipNameById.get(t.equipment_id)
                        : null,
                    )
                    .filter((n): n is string => !!n),
                ),
              );

              return (
                <div
                  key={exp.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                >
                  <button
                    onClick={() => toggle(exp.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${pal.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-gray-800">
                          {exp.name}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {period}
                        </span>
                        {exp.total_steps > 0 && (
                          <span>
                            ステップ {exp.current_step}/{exp.total_steps}
                          </span>
                        )}
                        {usedEquip.length > 0 && (
                          <span>装置: {usedEquip.join(" / ")}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gray-400 transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      {expTasks.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          この実験にはタスクがありません。
                        </p>
                      ) : (
                        <ol className="space-y-1.5">
                          {expTasks.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  t.status === "done"
                                    ? "bg-emerald-500"
                                    : t.status === "failed"
                                      ? "bg-rose-500"
                                      : "bg-gray-300"
                                }`}
                              />
                              <span
                                className={`flex-1 truncate ${
                                  t.status === "done"
                                    ? "text-gray-400 line-through"
                                    : "text-gray-700"
                                }`}
                              >
                                {t.title}
                              </span>
                              <span className="shrink-0 text-xs text-gray-400">
                                {fmtDate(new Date(t.start_time).getTime())}{" "}
                                {fmtTime(new Date(t.start_time).getTime())}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {/* 完了操作 */}
                      <div className="mt-3 flex justify-end">
                        {exp.status === "done" ? (
                          <button
                            onClick={() =>
                              updateExp.mutate({
                                id: exp.id,
                                status: "in_progress",
                              })
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            完了を取消
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              updateExp.mutate({
                                id: exp.id,
                                status: "done",
                                current_step: exp.total_steps,
                              })
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            実験を完了にする
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-gray-400">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function FeatureToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
      {/* トグルスイッチ */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/** 培養リネージュ: 継代の親子を手動登録し、系統ツリーで表示 */
function CultureLineage({
  experiments,
  tasks,
}: {
  experiments: Experiment[];
  tasks: Task[];
}) {
  const linksQ = useCultureLinks();
  const addLink = useAddCultureLink();
  const delLink = useDeleteCultureLink();
  const links = linksQ.data ?? [];

  const expName = new Map(experiments.map((e) => [e.id, e.name]));
  const expColor = new Map(experiments.map((e) => [e.id, e.color]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const options = [...tasks].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const label = (t: Task) => {
    const en = t.experiment_id ? expName.get(t.experiment_id) : null;
    return `${t.title}（${en ? en + "・" : ""}${fmtDate(
      new Date(t.start_time).getTime(),
    )}）`;
  };

  const [showForm, setShowForm] = useState(false);
  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [passage, setPassage] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parentId || !childId) {
      setError("親（継代元）と子（継代先）の両方を選択してください。");
      return;
    }
    if (parentId === childId) {
      setError("親と子は別のタスクにしてください。");
      return;
    }
    if (
      links.some(
        (l) => l.parent_task_id === parentId && l.child_task_id === childId,
      )
    ) {
      setError("この親子関係は既に登録済みです。");
      return;
    }
    addLink.mutate({
      parent_task_id: parentId,
      child_task_id: childId,
      passage_no: passage ? Number(passage) : null,
      note: note.trim() || null,
    });
    setParentId("");
    setChildId("");
    setPassage("");
    setNote("");
    setShowForm(false);
  }

  function taskDateTime(id: string): string {
    const t = taskById.get(id);
    if (!t) return "";
    const ms = new Date(t.start_time).getTime();
    return `${fmtDate(ms)} ${fmtTime(ms)}`;
  }

  function exportCsv() {
    const header = [
      "親（継代元）",
      "親_実験",
      "親_開始",
      "子（継代先）",
      "子_実験",
      "子_開始",
      "継代数P",
      "メモ",
    ];
    const rows = links.map((l) => {
      const p = taskById.get(l.parent_task_id);
      const c = taskById.get(l.child_task_id);
      return [
        p?.title ?? "（削除済み）",
        (p?.experiment_id ? expName.get(p.experiment_id) : "") ?? "",
        taskDateTime(l.parent_task_id),
        c?.title ?? "（削除済み）",
        (c?.experiment_id ? expName.get(c.experiment_id) : "") ?? "",
        taskDateTime(l.child_task_id),
        l.passage_no != null ? String(l.passage_no) : "",
        l.note ?? "",
      ];
    });
    downloadCsv("culture_lineage.csv", [header, ...rows]);
  }

  // ツリー構築
  const childrenByParent = new Map<string, CultureLink[]>();
  for (const l of links) {
    if (!childrenByParent.has(l.parent_task_id))
      childrenByParent.set(l.parent_task_id, []);
    childrenByParent.get(l.parent_task_id)!.push(l);
  }
  const childIds = new Set(links.map((l) => l.child_task_id));
  const rootIds = Array.from(
    new Set(links.map((l) => l.parent_task_id)),
  ).filter((id) => !childIds.has(id));

  function renderNode(
    taskId: string,
    linkToHere: CultureLink | null,
    visited: Set<string>,
  ): React.ReactNode {
    const t = taskById.get(taskId);
    const cyclic = visited.has(taskId);
    const nextVisited = new Set(visited);
    nextVisited.add(taskId);
    const children = cyclic ? [] : childrenByParent.get(taskId) ?? [];
    const pal = paletteFor(
      t?.experiment_id ? expColor.get(t.experiment_id) : "teal",
    );
    const en = t?.experiment_id ? expName.get(t.experiment_id) : null;

    return (
      <div key={(linkToHere?.id ?? "root") + taskId}>
        {/* ノードカード */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-emerald-200">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${pal.dot}`} />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-gray-800">
              {t ? t.title : "（削除済み）"}
            </div>
            {t && (
              <div className="truncate text-[10px] text-gray-400">
                {en ? `${en} · ` : ""}
                {fmtDate(new Date(t.start_time).getTime())}{" "}
                {fmtTime(new Date(t.start_time).getTime())}
              </div>
            )}
          </div>
          {linkToHere?.passage_no != null && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              P{linkToHere.passage_no}
            </span>
          )}
          {linkToHere?.note && (
            <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
              {linkToHere.note}
            </span>
          )}
          {linkToHere && (
            <button
              onClick={() => delLink.mutate(linkToHere.id)}
              title="この継代リンクを削除"
              className="shrink-0 rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-rose-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 子ノード（接続線つき） */}
        {children.length > 0 && (
          <div className="relative ml-3.5 mt-1.5 space-y-1.5 border-l-2 border-emerald-200 pl-4">
            {children.map((cl) => (
              <div key={cl.id} className="relative">
                {/* 親から子への横枝（エルボー） */}
                <span className="absolute -left-4 top-4 h-0.5 w-4 rounded-full bg-emerald-200" />
                {renderNode(cl.child_task_id, cl, nextVisited)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            培養リネージュ（継代の親子登録）
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {links.length > 0 && (
            <button
              onClick={exportCsv}
              title="継代系統をCSVで書き出し"
              className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setError(null);
            }}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
          >
            <Plus className="h-3.5 w-3.5" />
            継代を登録
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        継代元（親）と継代先（子）を選んで系統を記録します。前培養→本培養、継代 1→2→3 などを親子でつなげます。
      </p>

      {/* 登録フォーム */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mb-3 space-y-2 rounded-xl border border-emerald-200 bg-white p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-gray-500">
              親（継代元）
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">選択…</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-gray-500">
              子（継代先）
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">選択…</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-gray-500">
              継代数 P（任意）
              <input
                type="number"
                min={0}
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="例: 3"
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              メモ（任意）
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="分割比 1:10 など"
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              登録
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 系統ツリー */}
      {links.length === 0 ? (
        <p className="rounded-lg border border-dashed border-emerald-200 bg-white/60 py-6 text-center text-xs text-gray-400">
          まだ継代の親子関係が登録されていません。「継代を登録」から追加してください。
          <br />
          カレンダーに前培養・本培養・継代培養の予定を作っておくと選択できます。
        </p>
      ) : (
        <div className="space-y-3">
          {rootIds.map((id) => (
            <div
              key={id}
              className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-3 thin-scroll"
            >
              {renderNode(id, null, new Set())}
            </div>
          ))}
          <div className="flex items-center gap-3 px-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">
                P◯
              </span>
              継代数
            </span>
            <span>親（継代元）→ 下にぶら下がるほど後の継代</span>
          </div>
        </div>
      )}
    </section>
  );
}
