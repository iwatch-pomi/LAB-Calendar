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
  useSeedDemoData,
} from "@/lib/queries";
import { useCreateTask, useDeleteTask, useAddTodo } from "@/lib/queries";
import { usePlaceTemplateAt } from "@/lib/mutations";
import type { FeatureFlags } from "@/lib/types";
import { Onboarding } from "./Onboarding";
import { DemoDataChoiceModal } from "./DemoDataChoiceModal";
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
import { TutorialModal } from "./TutorialModal";
import { AuthModal } from "./auth/AuthModal";
import { GuestBanner, MigratedBanner } from "./GuestBanner";
import { guestStore } from "@/lib/guestStore";
import { shouldAutoOpenTutorial } from "@/lib/tutorial";
import { isTeacher, shouldAskRole } from "@/lib/role";
import { TeacherHint } from "./TeacherHint";
import { useClaimInvitationsOnce } from "@/lib/sharedQueries";

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
  const seedDemo = useSeedDemoData();
  const {
    isGuest,
    promptOpen,
    closePrompt,
    tutorialOpen,
    openTutorial,
    closeTutorial,
    authOpen,
    closeAuth,
  } = useGuest();
  const addTodo = useAddTodo();

  const [view, setViewState] = useState<ViewMode>("week");
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
  const VIEW_KEY = "labocale.view";

  // 表示モード（日/週/月）を localStorage に保存し、次回アクセス時も復元する
  const setView = (value: ViewMode) => {
    setViewState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_KEY, value);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === "day" || stored === "week" || stored === "month") {
      setViewState(stored);
    }
  }, []);

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

  // 教授は自分のカレンダーを持たないので、カレンダー側の案内は一切出さない。
  const isTeacherUser = isTeacher(settingsQ.data);

  // 利用形態の確認中（モーダル自体は RoleGate が出す。ここでは重ねないための判定だけ）
  const showRoleChoice = shouldAskRole({
    isGuest,
    settingsLoaded: settingsQ.isSuccess,
    roleChosen: settingsQ.data?.role_chosen === true,
    onboarded: settingsQ.data?.onboarded === true,
  });

  // 新規登録直後（実験が1件も無い）は、まずデモデータを使うか確認する。
  // 回答が済むまでは分野選択のオンボーディングを出さない。
  const showDemoChoice =
    !isGuest &&
    !isTeacherUser &&
    !showRoleChoice &&
    settingsQ.isSuccess &&
    experimentsQ.isSuccess &&
    experiments.length === 0 &&
    !settingsQ.data?.demo_seed_asked;

  function chooseDemo(useDemo: boolean) {
    if (useDemo) seedDemo.mutate();
    updateFeatures.mutate({ demo_seed_asked: true });
  }

  // 初回起動: 設定が読み込めて未オンボーディングなら分野選択を表示。
  // ゲストは設定を保存できず overlay を閉じられなくなるため出さない。
  const showOnboarding =
    !isGuest &&
    !isTeacherUser &&
    !showRoleChoice &&
    !showDemoChoice &&
    settingsQ.isSuccess &&
    !settingsQ.data?.onboarded;

  function completeOnboarding(flags: FeatureFlags) {
    updateFeatures.mutate(flags);
  }

  // 使い方のチュートリアル。ゲストの初回表示は GuestProvider が済ませているので、
  // ここで見るのはログイン後の分だけ（デモ選択・分野選択が片付いてから出す）。
  const tutorialAutoRan = useRef(false);
  useEffect(() => {
    if (isGuest || tutorialAutoRan.current) return;
    if (
      !shouldAutoOpenTutorial({
        isGuest,
        cameForLogin: false,
        guestSeen: false,
        settingsLoaded: settingsQ.isSuccess,
        tutorialDone: !!settingsQ.data?.tutorial_done,
        showDemoChoice,
        showOnboarding,
        showRoleChoice,
        isTeacher: isTeacherUser,
      })
    )
      return;
    tutorialAutoRan.current = true;
    openTutorial();
  }, [
    isGuest,
    settingsQ.isSuccess,
    settingsQ.data?.tutorial_done,
    showDemoChoice,
    showOnboarding,
    showRoleChoice,
    isTeacherUser,
    openTutorial,
  ]);

  // 既読の保存先はモードで違う。ゲストはブラウザ、ログイン後はアカウント。
  function finishTutorial() {
    if (isGuest) guestStore.markSeenTutorial();
    else updateFeatures.mutate({ tutorial_done: true });
    closeTutorial();
  }

  // ログイン直後: ゲスト中にブラウザへ作った予定/ToDoをアカウントへ引き継ぐ。
  // 対象はユーザーが自分で作成/変更した分のみ（デモそのままの行は含めない）。
  // ログイン後: 自分のメール宛に届いていた共有の招待を実際の共有に変える。
  // （相手が「まだ登録していない人」に共有したときは招待として積まれている）
  useClaimInvitationsOnce(!isGuest);

  // ゲスト中にチュートリアルを見終えていたら、その既読をアカウントへ引き継ぐ。
  // 下の移行処理が guestStore.clear() でフラグごと消すので、必ずその前に読む。
  // 「引き継ぐ予定が無ければ即 return」の経路（素見のゲストが登録する典型）も
  // 通るよう、移行本体とは別の ref で1回だけに絞る。
  const tutorialHandoffRan = useRef(false);
  useEffect(() => {
    if (isGuest || tutorialHandoffRan.current) return;
    tutorialHandoffRan.current = true;
    if (!guestStore.hasSeenTutorial()) return;
    updateFeatures.mutate({ tutorial_done: true });
  }, [isGuest, updateFeatures]);

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
      {showDemoChoice && (
        <DemoDataChoiceModal
          onKeep={() => chooseDemo(true)}
          onSkip={() => chooseDemo(false)}
          saving={seedDemo.isPending || updateFeatures.isPending}
        />
      )}
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
          onOpenTutorial={openTutorial}
          userEmail={userEmail}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {isGuest && <GuestBanner />}
        {isTeacherUser && <TeacherHint />}
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
      {!authOpen && tutorialOpen && !openTask && (
        <TutorialModal isGuest={isGuest} onFinish={finishTutorial} />
      )}
      {!authOpen && !tutorialOpen && promptOpen && !openTask && (
        <LoginPromptModal onClose={closePrompt} />
      )}

      {authOpen && <AuthModal onClose={closeAuth} />}
    </div>
  );
}
