"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useCreateTask, useDeleteTask, useAddTodo } from "@/lib/queries";
import { usePlaceTemplateAt } from "@/lib/mutations";
import type { FeatureFlags } from "@/lib/types";
import { Onboarding } from "./Onboarding";
import { nowMs } from "@/lib/calendar";
import {
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
} from "@/lib/config";
import type { Task, Template } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { TaskModal } from "./TaskModal";
import { AddExperimentMenu } from "./AddExperimentMenu";
import { TemplateBuilder } from "./TemplateBuilder";
import { GuestProvider, useGuest } from "./GuestProvider";
import { LoginPromptModal } from "./LoginPromptModal";
import { DemoNoticeModal } from "./DemoNoticeModal";
import { GuestBanner, MigratedBanner } from "./GuestBanner";
import { guestStore } from "@/lib/guestStore";

export type ViewMode = "day" | "week" | "month";

/**
 * ゲスト文脈は全データフックから参照されるため、フックを呼ぶ本体より
 * 外側に Provider を置く必要がある。
 */
export function CalendarApp({
  userEmail,
  isGuest = false,
}: {
  userEmail: string;
  isGuest?: boolean;
}) {
  return (
    <GuestProvider isGuest={isGuest}>
      <CalendarAppInner userEmail={userEmail} />
    </GuestProvider>
  );
}

function CalendarAppInner({ userEmail }: { userEmail: string }) {
  const tasksQ = useTasks();
  const experimentsQ = useExperiments();
  const depsQ = useDependencies();
  const todosQ = useTodos();
  const equipmentQ = useEquipment();
  const templatesQ = useTemplates();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const placeTemplate = usePlaceTemplateAt();
  const settingsQ = useSettings();
  const updateFeatures = useUpdateFeatures();
  const { isGuest, promptOpen, closePrompt, demoNoticeOpen, closeDemoNotice } =
    useGuest();
  const addTodo = useAddTodo();

  const [view, setView] = useState<ViewMode>("week");
  // ログイン直後、ゲスト中に作った予定/ToDoを引き継いだ件数
  const [migrated, setMigrated] = useState<number | null>(null);
  const [refMs, setRefMs] = useState<number>(() => nowMs());
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(
    null,
  );
  const [openTask, setOpenTask] = useState<Task | null>(null);
  // 空き枠クリックで作った未確定の予定（保存せず閉じたら削除する）
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [templateEdit, setTemplateEdit] = useState<Template | "new" | null>(
    null,
  );
  const [placingTemplate, setPlacingTemplate] = useState<Template | null>(
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

  // 空き枠クリック → テンプレ配置モード中ならステップを連続配置、そうでなければ新規予定を作成
  async function handleCreateAt(startMs: number) {
    if (placingTemplate) {
      const tpl = placingTemplate;
      setPlacingTemplate(null);
      await placeTemplate.mutateAsync({
        templateId: tpl.id,
        startISO: new Date(startMs).toISOString(),
      });
      return;
    }
    const created = await createTask.mutateAsync({
      title: "新しい予定",
      start_time: new Date(startMs).toISOString(),
      end_time: new Date(startMs + 60 * 60 * 1000).toISOString(),
      experiment_id: selectedExperiment ?? undefined,
    });
    if (created) {
      // 空き枠から作った予定は「下書き」。保存せず閉じたら破棄する。
      setDraftTaskId(created.id);
      setOpenTask(created);
    }
  }

  // 既存予定を開く（下書きではない）
  function openExistingTask(t: Task) {
    setDraftTaskId(null);
    setOpenTask(t);
  }

  // モーダルを閉じる（保存＝下書きを確定して残す）
  function closeTaskModal() {
    setDraftTaskId(null);
    setOpenTask(null);
  }

  // 下書きを破棄して閉じる（保存ボタンを押さずに閉じた場合）
  function discardTaskModal() {
    if (draftTaskId) deleteTask.mutate(draftTaskId);
    setDraftTaskId(null);
    setOpenTask(null);
  }

  // 配置モード中に Escape でキャンセル
  useEffect(() => {
    if (!placingTemplate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlacingTemplate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placingTemplate]);

  const loading =
    tasksQ.isLoading || experimentsQ.isLoading || depsQ.isLoading;

  // 表示日数: 日表示は常に1日、週表示は画面幅に応じて3/7日、月表示は無関係
  const activeDays = view === "day" ? 1 : visibleDays;

  const weekStartsOn: 0 | 1 = settingsQ.data?.week_start_day === 0 ? 0 : 1;
  const workStartHour =
    typeof settingsQ.data?.work_start_hour === "number"
      ? settingsQ.data.work_start_hour
      : DEFAULT_WORK_START_HOUR;
  const workEndHour =
    typeof settingsQ.data?.work_end_hour === "number"
      ? settingsQ.data.work_end_hour
      : DEFAULT_WORK_END_HOUR;

  // 初回起動: 設定が読み込めて未オンボーディングなら分野選択を表示。
  // ゲストは設定を保存できず overlay を閉じられなくなるため出さない。
  const showOnboarding =
    !isGuest && settingsQ.isSuccess && !settingsQ.data?.onboarded;

  function completeOnboarding(flags: FeatureFlags) {
    updateFeatures.mutate(flags);
  }

  // ログイン直後: ゲスト中にブラウザへ作った予定/ToDoをアカウントへ引き継ぐ。
  // 対象はユーザーが自分で作成/変更した分のみ（デモそのままの行は含めない）。
  const migrateRan = useRef(false);
  useEffect(() => {
    if (isGuest || migrateRan.current) return;
    const { tasks: gTasks, todos: gTodos } = guestStore.exportForMigration();
    if (gTasks.length === 0 && gTodos.length === 0) {
      // 引き継ぐものが無ければゲストデータは破棄しておく
      guestStore.clear();
      return;
    }
    migrateRan.current = true;
    (async () => {
      let n = 0;
      for (const t of gTasks) {
        try {
          await createTask.mutateAsync({
            title: t.title,
            start_time: t.start_time,
            end_time: t.end_time,
            // ゲストの実験idはサーバーに存在しないため単発の予定として保存
            experiment_id: null,
            subtitle: t.subtitle,
            is_wait: t.is_wait,
          });
          n++;
        } catch {
          // 1件失敗しても残りは続行
        }
      }
      for (const [i, td] of gTodos.entries()) {
        try {
          await addTodo.mutateAsync({
            title: td.title,
            sort_order: 1000 + i,
            due_at: td.due_at,
          });
          n++;
        } catch {
          // 同上
        }
      }
      guestStore.clear();
      setMigrated(n);
    })();
  }, [isGuest, createTask, addTodo]);

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
          onClose={() => setSidebarOpen(false)}
          userEmail={userEmail}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {isGuest && <GuestBanner />}
        {migrated !== null && migrated > 0 && (
          <MigratedBanner count={migrated} onClose={() => setMigrated(null)} />
        )}
        <CalendarHeader
          view={view}
          onViewChange={setView}
          refMs={refMs}
          onRefChange={setRefMs}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
          visibleDays={activeDays}
          weekStartsOn={weekStartsOn}
          onAddClick={() => setAddMenuOpen((v) => !v)}
          addMenuOpen={addMenuOpen}
          addMenu={
            <AddExperimentMenu
              templates={templatesQ.data ?? []}
              refMs={refMs}
              weekStartsOn={weekStartsOn}
              onClose={() => setAddMenuOpen(false)}
              onCreateTemplate={() => {
                setAddMenuOpen(false);
                setTemplateEdit("new");
              }}
              onEditTemplate={(t) => {
                setAddMenuOpen(false);
                setTemplateEdit(t);
              }}
              onPlaceTemplate={(t) => setPlacingTemplate(t)}
            />
          }
        />

        {placingTemplate && (
          <div className="flex items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm">
            <span className="text-brand-800">
              「{placingTemplate.name}」の全ステップを配置します。カレンダー上で開始位置をクリックしてください（隙間なく連続配置・後で自由に並び替え可）。
            </span>
            <button
              onClick={() => setPlacingTemplate(null)}
              className="shrink-0 rounded-lg border border-brand-300 bg-white px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              キャンセル
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {loading ? (
            <div className="grid h-full place-items-center text-sm text-gray-400">
              読み込み中…
            </div>
          ) : view !== "month" ? (
            <WeekView
              refMs={refMs}
              tasks={tasks}
              deps={deps}
              expColorById={expColorById}
              equipNameById={equipNameById}
              selectedExperiment={selectedExperiment}
              visibleDays={activeDays}
              weekStartsOn={weekStartsOn}
              workStartHour={workStartHour}
              workEndHour={workEndHour}
              onTaskClick={(t) => openExistingTask(t)}
              onCreateAt={handleCreateAt}
            />
          ) : (
            <MonthView
              refMs={refMs}
              tasks={tasks}
              expColorById={expColorById}
              weekStartsOn={weekStartsOn}
              onTaskClick={(t) => openExistingTask(t)}
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
          isDraft={openTask.id === draftTaskId}
          onClose={closeTaskModal}
          onDiscard={discardTaskModal}
        />
      )}

      {templateEdit && (
        <TemplateBuilder
          template={templateEdit === "new" ? undefined : templateEdit}
          onClose={() => setTemplateEdit(null)}
        />
      )}

      {/* 予定モーダルを開いている間は重ねず、閉じてから案内を出す */}
      {demoNoticeOpen && !openTask && (
        <DemoNoticeModal onClose={closeDemoNotice} />
      )}
      {!demoNoticeOpen && promptOpen && !openTask && (
        <LoginPromptModal onClose={closePrompt} />
      )}
    </div>
  );
}
