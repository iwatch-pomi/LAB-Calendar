"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useTasks,
  useExperiments,
  useDependencies,
  useTodos,
  useEquipment,
  useTemplates,
  useSettings,
  useUpdateFeatures,
} from "@/lib/queries";
import { useCreateTask } from "@/lib/queries";
import type { FeatureFlags } from "@/lib/types";
import { Onboarding } from "./Onboarding";
import { nowMs } from "@/lib/calendar";
import type { Task, Template } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { TaskModal } from "./TaskModal";
import { AddExperimentMenu } from "./AddExperimentMenu";
import { TemplateBuilder } from "./TemplateBuilder";

export type ViewMode = "week" | "month";

export function CalendarApp({ userEmail }: { userEmail: string }) {
  const tasksQ = useTasks();
  const experimentsQ = useExperiments();
  const depsQ = useDependencies();
  const todosQ = useTodos();
  const equipmentQ = useEquipment();
  const templatesQ = useTemplates();
  const createTask = useCreateTask();
  const settingsQ = useSettings();
  const updateFeatures = useUpdateFeatures();

  const [view, setView] = useState<ViewMode>("week");
  const [refMs, setRefMs] = useState<number>(() => nowMs());
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(
    null,
  );
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [templateEdit, setTemplateEdit] = useState<Template | "new" | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [visibleDays, setVisibleDays] = useState(7);

  const SIDEBAR_KEY = "labocale.sidebarOpen";

  // サイドバーの開閉状態を localStorage に保存し「固定表示」を維持する
  const setSidebarOpen = (
    value: boolean | ((prev: boolean) => boolean),
  ) => {
    setSidebarOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  // 初回マウント時: 保存済みの設定があればそれを復元、無ければ画面幅から既定値を決める
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) {
      setSidebarOpenState(stored === "1");
    } else if (window.innerWidth < 1024) {
      setSidebarOpenState(false);
    }
  }, []);

  // スマホ(〜639px)は3日表示、タブレット以上は7日(1週間)表示
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setVisibleDays(mq.matches ? 3 : 7);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const tasks = tasksQ.data ?? [];
  const experiments = experimentsQ.data ?? [];
  const deps = depsQ.data ?? [];
  const equipment = equipmentQ.data ?? [];

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

  // 空き枠クリック → 新規予定を作成してモーダルを開く
  async function handleCreateAt(startMs: number) {
    const created = await createTask.mutateAsync({
      title: "新しい予定",
      start_time: new Date(startMs).toISOString(),
      end_time: new Date(startMs + 60 * 60 * 1000).toISOString(),
      experiment_id: selectedExperiment ?? undefined,
    });
    if (created) setOpenTask(created);
  }

  const loading =
    tasksQ.isLoading || experimentsQ.isLoading || depsQ.isLoading;

  // 初回起動: 設定が読み込めて未オンボーディングなら分野選択を表示
  const showOnboarding =
    settingsQ.isSuccess && !settingsQ.data?.onboarded;

  function completeOnboarding(flags: FeatureFlags) {
    updateFeatures.mutate(flags);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fa]">
      {showOnboarding && (
        <Onboarding
          onComplete={completeOnboarding}
          saving={updateFeatures.isPending}
        />
      )}
      {/* サイドバー（常にドッキング表示。開くとカレンダーを横へ押し出す） */}
      <div
        className={`h-full shrink-0 overflow-hidden transition-[width] duration-200 ${
          sidebarOpen ? "w-[264px]" : "w-0"
        }`}
      >
        <Sidebar
          experiments={experiments}
          todos={todosQ.data ?? []}
          selectedExperiment={selectedExperiment}
          onSelectExperiment={setSelectedExperiment}
          onOpenAddMenu={() => setAddMenuOpen(true)}
          onClose={() => setSidebarOpen(false)}
          userEmail={userEmail}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <CalendarHeader
          view={view}
          onViewChange={setView}
          refMs={refMs}
          onRefChange={setRefMs}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
          visibleDays={visibleDays}
          onAddClick={() => setAddMenuOpen((v) => !v)}
          addMenuOpen={addMenuOpen}
          addMenu={
            <AddExperimentMenu
              templates={templatesQ.data ?? []}
              refMs={refMs}
              onClose={() => setAddMenuOpen(false)}
              onCreateTemplate={() => {
                setAddMenuOpen(false);
                setTemplateEdit("new");
              }}
              onEditTemplate={(t) => {
                setAddMenuOpen(false);
                setTemplateEdit(t);
              }}
            />
          }
        />

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {loading ? (
            <div className="grid h-full place-items-center text-sm text-gray-400">
              読み込み中…
            </div>
          ) : view === "week" ? (
            <WeekView
              refMs={refMs}
              tasks={tasks}
              deps={deps}
              expColorById={expColorById}
              equipNameById={equipNameById}
              selectedExperiment={selectedExperiment}
              visibleDays={visibleDays}
              onTaskClick={(t) => setOpenTask(t)}
              onCreateAt={handleCreateAt}
            />
          ) : (
            <MonthView
              refMs={refMs}
              tasks={tasks}
              expColorById={expColorById}
              onTaskClick={(t) => setOpenTask(t)}
              onCreateAt={handleCreateAt}
            />
          )}
        </div>
      </div>

      {openTask && (
        <TaskModal
          task={openTask}
          tasks={tasks}
          deps={deps}
          experiments={experiments}
          equipment={equipment}
          onClose={() => setOpenTask(null)}
        />
      )}

      {templateEdit && (
        <TemplateBuilder
          template={templateEdit === "new" ? undefined : templateEdit}
          onClose={() => setTemplateEdit(null)}
        />
      )}
    </div>
  );
}
