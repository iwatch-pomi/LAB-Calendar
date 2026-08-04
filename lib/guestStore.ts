// ゲスト（未ログイン）の編集内容を localStorage に保持する小さなストア。
// サーバーには一切書き込まないため、ゲストの読み書きはすべてここを経由する。
// ログイン後、ユーザーが自分で作成/変更した分だけアカウントへ引き継ぐ。

import { weekStartMs } from "@/lib/calendar";
import { buildGuestDemo, GUEST_USER_ID, type GuestSnapshot } from "@/lib/guestData";
import type { Task, Todo } from "@/lib/types";

const KEY = "labocale.guest.v1";

export interface GuestState extends GuestSnapshot {
  /** ユーザーが自分で作成・変更した予定の id（引継ぎ対象） */
  touchedTaskIds: string[];
  /** ユーザーが自分で作成・変更した ToDo の id（引継ぎ対象） */
  touchedTodoIds: string[];
  /** ユーザーが削除した「元デモ」予定の id（再アンカー時に復活させないため） */
  deletedDemoTaskIds: string[];
  /** 同上・ToDo */
  deletedDemoTodoIds: string[];
  /** 初回編集時のログイン案内モーダルを既に出したか */
  hasPromptedLogin: boolean;
  /** 初回アクセス時のチュートリアルを既に出したか */
  hasSeenTutorial: boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function fresh(): GuestState {
  return {
    ...buildGuestDemo(),
    touchedTaskIds: [],
    touchedTodoIds: [],
    deletedDemoTaskIds: [],
    deletedDemoTodoIds: [],
    hasPromptedLogin: false,
    hasSeenTutorial: false,
  };
}

/**
 * 保存済みスナップショットの週が「今」とズレていたら、今週基点に再アンカーする。
 *
 * ゲストは localStorage に保存された内容をそのまま使い続けるため、週をまたいで
 * 再訪すると元デモの予定・ToDo が古い週の日時のまま固定されてしまう
 * （buildGuestDemo() 自体は毎回「今週」を計算する純粋関数だが、それを
 * 呼び直す処理が無かった）。ユーザーが編集・削除していない元デモの項目だけを
 * 今週の日時に差し替え、編集済み・削除済み・ユーザー作成分はそのまま残す。
 * DOM に依存しないピュア関数なのでテスト可能。
 */
export function reanchorIfStale(state: GuestState, nowMs: number): GuestState {
  const monday = weekStartMs(nowMs, 1);
  if (state.anchorMonday === monday) return state;

  const regen = buildGuestDemo(nowMs);
  // 本フィックス以前に保存された localStorage には無いフィールドなので、
  // 無ければ「何も編集/削除していない」扱いにする（未リリースのため移行処理は不要）。
  const touchedTaskIds = state.touchedTaskIds ?? [];
  const touchedTodoIds = state.touchedTodoIds ?? [];
  const deletedDemoTaskIds = state.deletedDemoTaskIds ?? [];
  const deletedDemoTodoIds = state.deletedDemoTodoIds ?? [];

  const keepTasks = state.tasks.filter(
    (t) => !t.id.startsWith("guest-task-") || touchedTaskIds.includes(t.id),
  );
  const freshTasks = regen.tasks.filter(
    (t) => !touchedTaskIds.includes(t.id) && !deletedDemoTaskIds.includes(t.id),
  );

  const keepTodos = state.todos.filter(
    (t) => !t.id.startsWith("guest-todo-") || touchedTodoIds.includes(t.id),
  );
  const freshTodos = regen.todos.filter(
    (t) => !touchedTodoIds.includes(t.id) && !deletedDemoTodoIds.includes(t.id),
  );

  return {
    ...state,
    anchorMonday: monday,
    tasks: [...keepTasks, ...freshTasks],
    todos: [...keepTodos, ...freshTodos],
    touchedTaskIds,
    touchedTodoIds,
    deletedDemoTaskIds,
    deletedDemoTodoIds,
  };
}

let cache: GuestState | null = null;

function load(): GuestState {
  if (!cache) {
    if (!isBrowser()) return fresh();
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) cache = JSON.parse(raw) as GuestState;
    } catch {
      // 壊れていたら作り直す
    }
    if (!cache) {
      cache = fresh();
      save();
      return cache;
    }
  }

  const reanchored = reanchorIfStale(cache, Date.now());
  if (reanchored !== cache) {
    cache = reanchored;
    save();
  }
  return cache;
}

function save() {
  if (!isBrowser() || !cache) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 容量超過などは黙って諦める（ゲストのお試し用途のため）
  }
}

function newId(): string {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function markTask(id: string) {
  const s = load();
  if (!s.touchedTaskIds.includes(id)) s.touchedTaskIds.push(id);
}

function markTodo(id: string) {
  const s = load();
  if (!s.touchedTodoIds.includes(id)) s.touchedTodoIds.push(id);
}

export const guestStore = {
  // ---------------- 読み取り ----------------
  tasks: () => load().tasks,
  experiments: () => load().experiments,
  deps: () => load().deps,
  todos: () => load().todos,
  equipment: () => load().equipment,
  templates: () => load().templates,
  templateSteps: () => load().templateSteps,

  // ---------------- 予定 ----------------
  createTask(args: {
    title: string;
    start_time: string;
    end_time: string;
    experiment_id?: string | null;
    subtitle?: string | null;
    equipment_id?: string | null;
    is_wait?: boolean;
  }): Task {
    const s = load();
    const now = new Date().toISOString();
    const t: Task = {
      id: newId(),
      user_id: GUEST_USER_ID,
      experiment_id: args.experiment_id ?? null,
      title: args.title,
      subtitle: args.subtitle ?? null,
      start_time: args.start_time,
      end_time: args.end_time,
      status: "planned",
      equipment_id: args.equipment_id ?? null,
      needs_reservation: !!args.equipment_id,
      is_wait: args.is_wait ?? false,
      task_kind: args.is_wait ? "wait" : "operation",
      template_step_id: null,
      notes: null,
      created_at: now,
    };
    s.tasks.push(t);
    markTask(t.id);
    save();
    return t;
  },

  updateTask(id: string, patch: Partial<Task>) {
    const s = load();
    s.tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    markTask(id);
    save();
  },

  deleteTask(id: string) {
    const s = load();
    s.tasks = s.tasks.filter((t) => t.id !== id);
    s.deps = s.deps.filter(
      (d) => d.predecessor_id !== id && d.successor_id !== id,
    );
    s.touchedTaskIds = s.touchedTaskIds.filter((x) => x !== id);
    if (id.startsWith("guest-task-") && !s.deletedDemoTaskIds.includes(id)) {
      s.deletedDemoTaskIds.push(id);
    }
    save();
  },

  // ---------------- ToDo ----------------
  createTodo(args: {
    title: string;
    sort_order: number;
    due_at?: string | null;
  }): Todo {
    const s = load();
    const t: Todo = {
      id: newId(),
      user_id: GUEST_USER_ID,
      title: args.title,
      due_at: args.due_at ?? null,
      done: false,
      completed_at: null,
      task_id: null,
      sort_order: args.sort_order,
      created_at: new Date().toISOString(),
    };
    s.todos.push(t);
    markTodo(t.id);
    save();
    return t;
  },

  updateTodo(id: string, patch: Partial<Todo>) {
    const s = load();
    s.todos = s.todos.map((t) => (t.id === id ? { ...t, ...patch } : t));
    markTodo(id);
    save();
  },

  deleteTodo(id: string) {
    const s = load();
    s.todos = s.todos.filter((t) => t.id !== id);
    s.touchedTodoIds = s.touchedTodoIds.filter((x) => x !== id);
    if (id.startsWith("guest-todo-") && !s.deletedDemoTodoIds.includes(id)) {
      s.deletedDemoTodoIds.push(id);
    }
    save();
  },

  // ---------------- 初回モーダル ----------------
  hasPromptedLogin: () => load().hasPromptedLogin,
  markPromptedLogin() {
    const s = load();
    s.hasPromptedLogin = true;
    save();
  },

  // ---------------- 初回アクセス時のチュートリアル ----------------
  // 以前に保存された localStorage にはこのキーが無いので !! で未読扱いにする。
  hasSeenTutorial: () => !!load().hasSeenTutorial,
  markSeenTutorial() {
    const s = load();
    s.hasSeenTutorial = true;
    save();
  },

  // ---------------- ログイン後の引継ぎ ----------------
  /** ユーザーが自分で作成/変更した分だけを返す（デモそのままの行は含めない） */
  exportForMigration(): { tasks: Task[]; todos: Todo[] } {
    if (!isBrowser()) return { tasks: [], todos: [] };
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch {
      return { tasks: [], todos: [] };
    }
    if (!raw) return { tasks: [], todos: [] };
    try {
      const s = JSON.parse(raw) as GuestState;
      const tasks = s.tasks.filter((t) => s.touchedTaskIds.includes(t.id));
      const todos = s.todos.filter((t) => s.touchedTodoIds.includes(t.id));
      return { tasks, todos };
    } catch {
      return { tasks: [], todos: [] };
    }
  },

  /** localStorage のゲストデータを完全に消す（引継ぎ完了時 / ログイン後） */
  clear() {
    cache = null;
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // 何もしない
    }
  },
};
