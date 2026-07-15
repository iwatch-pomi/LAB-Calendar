"use client";

import { useMemo, useState } from "react";
import {
  useTasks,
  useExperiments,
  useDependencies,
  useTodos,
  useEquipment,
  useTemplates,
} from "@/lib/queries";
import { useCreateTask } from "@/lib/queries";
import { useCommitReschedule } from "@/lib/mutations";
import {
  rescheduleFromFailure,
  type RTask,
  type RDep,
  type Move,
} from "@/lib/reschedule";
import { WORKING_HOURS, TZ_OFFSET_MINUTES } from "@/lib/config";
import { nowMs } from "@/lib/calendar";
import type { Task } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { TaskModal } from "./TaskModal";
import { AddExperimentMenu } from "./AddExperimentMenu";
import { RescheduleDialog } from "./RescheduleDialog";
import { TemplateBuilder } from "./TemplateBuilder";

export type ViewMode = "week" | "month";

export interface ReschedulePlan {
  failedId: string;
  failedTitle: string;
  moves: Move[];
}

export function CalendarApp({ userEmail }: { userEmail: string }) {
  const tasksQ = useTasks();
  const experimentsQ = useExperiments();
  const depsQ = useDependencies();
  const todosQ = useTodos();
  const equipmentQ = useEquipment();
  const templatesQ = useTemplates();
  const commitReschedule = useCommitReschedule();
  const createTask = useCreateTask();

  const [view, setView] = useState<ViewMode>("week");
  const [refMs, setRefMs] = useState<number>(() => nowMs());
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(
    null,
  );
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [plan, setPlan] = useState<ReschedulePlan | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);

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

  // 失敗 → リスケ計算（プレビュー）
  function computeReschedule(failed: Task): ReschedulePlan {
    const rtasks: RTask[] = tasks.map((t) => ({
      id: t.id,
      start: new Date(t.start_time).getTime(),
      end: new Date(t.end_time).getTime(),
      equipmentId: t.equipment_id,
      isWait: t.is_wait,
    }));
    const rdeps: RDep[] = deps.map((d) => ({
      predecessorId: d.predecessor_id,
      successorId: d.successor_id,
      gapMinutes: d.gap_minutes,
    }));
    const moves = rescheduleFromFailure(rtasks, rdeps, failed.id, {
      now: nowMs(),
      workingHours: WORKING_HOURS,
      tzOffsetMinutes: TZ_OFFSET_MINUTES,
    });
    return { failedId: failed.id, failedTitle: failed.title, moves };
  }

  function onMarkFailed(task: Task) {
    setOpenTask(null);
    setPlan(computeReschedule(task));
  }

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

  async function confirmReschedule() {
    if (!plan) return;
    await commitReschedule.mutateAsync({
      failedId: plan.failedId,
      moves: plan.moves,
    });
    setHighlightIds(plan.moves.map((m) => m.id));
    setPlan(null);
    setTimeout(() => setHighlightIds([]), 2600);
  }

  const loading =
    tasksQ.isLoading || experimentsQ.isLoading || depsQ.isLoading;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fa]">
      <Sidebar
        experiments={experiments}
        todos={todosQ.data ?? []}
        selectedExperiment={selectedExperiment}
        onSelectExperiment={setSelectedExperiment}
        onOpenAddMenu={() => setAddMenuOpen(true)}
        userEmail={userEmail}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <CalendarHeader
          view={view}
          onViewChange={setView}
          refMs={refMs}
          onRefChange={setRefMs}
          onAddClick={() => setAddMenuOpen((v) => !v)}
          addMenuOpen={addMenuOpen}
          addMenu={
            <AddExperimentMenu
              templates={templatesQ.data ?? []}
              refMs={refMs}
              onClose={() => setAddMenuOpen(false)}
              onCreateTemplate={() => {
                setAddMenuOpen(false);
                setTemplateBuilderOpen(true);
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
              highlightIds={highlightIds}
              onTaskClick={(t) => setOpenTask(t)}
              onCreateAt={handleCreateAt}
            />
          ) : (
            <MonthView
              refMs={refMs}
              tasks={tasks}
              expColorById={expColorById}
              onTaskClick={(t) => setOpenTask(t)}
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
          onMarkFailed={onMarkFailed}
        />
      )}

      {plan && (
        <RescheduleDialog
          plan={plan}
          tasks={tasks}
          expColorById={expColorById}
          onCancel={() => setPlan(null)}
          onConfirm={confirmReschedule}
          committing={commitReschedule.isPending}
        />
      )}

      {templateBuilderOpen && (
        <TemplateBuilder onClose={() => setTemplateBuilderOpen(false)} />
      )}
    </div>
  );
}
