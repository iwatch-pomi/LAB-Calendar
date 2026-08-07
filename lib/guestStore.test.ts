import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildGuestDemo } from "./guestData";
import { guestStore, reanchorIfStale, type GuestState } from "./guestStore";
import { weekStartMs, DAY } from "./calendar";

// JST のローカル時刻から epoch ms を作る（reschedule.test.ts と同じ流儀）
function jst(y: number, mo: number, d: number, h: number, mi = 0): number {
  return Date.UTC(y, mo - 1, d, h - 9, mi);
}

function makeState(nowMs: number): GuestState {
  return {
    ...buildGuestDemo(nowMs),
    touchedTaskIds: [],
    touchedTodoIds: [],
    deletedDemoTaskIds: [],
    deletedDemoTodoIds: [],
    hasPromptedLogin: false,
    hasSeenTutorial: false,
  };
}

describe("reanchorIfStale", () => {
  const week1 = jst(2026, 6, 1, 9); // 月曜週の途中の任意の時刻
  const week2 = week1 + 14 * DAY; // 2週間後

  it("週が一致していれば同一参照を返す（余計な保存を避ける）", () => {
    const state = makeState(week1);
    const result = reanchorIfStale(state, week1 + 3 * DAY); // 同じ週内の別の日時
    expect(result).toBe(state);
  });

  it("週がズレていれば、未編集の元デモ予定・ToDoが今週の日時に更新される", () => {
    const state = makeState(week1);
    const result = reanchorIfStale(state, week2);
    const expectedMonday = weekStartMs(week2, 1);

    expect(result.anchorMonday).toBe(expectedMonday);
    const pre = result.tasks.find((t) => t.id === "guest-task-pre")!;
    const oldPre = state.tasks.find((t) => t.id === "guest-task-pre")!;
    expect(pre.start_time).not.toBe(oldPre.start_time);
    expect(new Date(pre.start_time).getTime()).toBeGreaterThanOrEqual(expectedMonday);

    const todo = result.todos.find((t) => t.id === "guest-todo-2")!;
    const oldTodo = state.todos.find((t) => t.id === "guest-todo-2")!;
    expect(todo.due_at).not.toBe(oldTodo.due_at);
  });

  it("編集済みの元デモ予定は上書きされない", () => {
    const state = makeState(week1);
    state.tasks = state.tasks.map((t) =>
      t.id === "guest-task-pre" ? { ...t, title: "ユーザーが変更したタイトル" } : t,
    );
    state.touchedTaskIds = ["guest-task-pre"];

    const result = reanchorIfStale(state, week2);
    const pre = result.tasks.find((t) => t.id === "guest-task-pre")!;
    expect(pre.title).toBe("ユーザーが変更したタイトル");
  });

  it("削除済みの元デモ予定は再アンカー後も復活しない", () => {
    const state = makeState(week1);
    state.tasks = state.tasks.filter((t) => t.id !== "guest-task-pre");
    state.deletedDemoTaskIds = ["guest-task-pre"];

    const result = reanchorIfStale(state, week2);
    expect(result.tasks.find((t) => t.id === "guest-task-pre")).toBeUndefined();
  });

  it("削除済みの元デモToDoは再アンカー後も復活しない", () => {
    const state = makeState(week1);
    state.todos = state.todos.filter((t) => t.id !== "guest-todo-4");
    state.deletedDemoTodoIds = ["guest-todo-4"];

    const result = reanchorIfStale(state, week2);
    expect(result.todos.find((t) => t.id === "guest-todo-4")).toBeUndefined();
  });

  it("ユーザーが作成した予定・ToDoは週が変わってもそのまま残る", () => {
    const state = makeState(week1);
    state.tasks.push({
      ...state.tasks[0],
      id: "own-task-abc",
      title: "自分で追加した予定",
    });
    state.todos.push({
      ...state.todos[0],
      id: "own-todo-abc",
      title: "自分で追加したToDo",
    });

    const result = reanchorIfStale(state, week2);
    expect(result.tasks.find((t) => t.id === "own-task-abc")?.title).toBe(
      "自分で追加した予定",
    );
    expect(result.todos.find((t) => t.id === "own-todo-abc")?.title).toBe(
      "自分で追加したToDo",
    );
  });

  it("本フィックス以前の localStorage（新フィールド無し）でもクラッシュせず再アンカーする", () => {
    const state = makeState(week1) as GuestState;
    // @ts-expect-error 古い保存形式を模擬
    delete state.deletedDemoTaskIds;
    // @ts-expect-error 同上
    delete state.deletedDemoTodoIds;

    const result = reanchorIfStale(state, week2);
    expect(result.anchorMonday).toBe(weekStartMs(week2, 1));
    expect(result.deletedDemoTaskIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// localStorage を触る部分。vitest の environment は "node" なので window が無く、
// そのままだと guestStore は「サーバー側」と判断して何も保存しない。
// 最小の window を差し込んで、実際の保存経路を通す。
// ---------------------------------------------------------------------------

/** lib/guestStore.ts の KEY と同じ値（外に出していないのでここに写す） */
const KEY = "labocale.guest.v1";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
  };
}

let storage: ReturnType<typeof memoryStorage>;

function seed(state: unknown) {
  storage.setItem(KEY, JSON.stringify(state));
  guestStore.clear(); // モジュール内キャッシュを捨てて localStorage から読み直させる
  storage.setItem(KEY, JSON.stringify(state)); // clear() が消すので入れ直す
}

function saved(): GuestState {
  return JSON.parse(storage.getItem(KEY)!) as GuestState;
}

describe("guestStore.dropMigrated", () => {
  const now = jst(2026, 6, 1, 9);

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    guestStore.clear();
  });

  afterEach(() => {
    guestStore.clear();
    vi.unstubAllGlobals();
  });

  /** 引継ぎ対象（touched）が予定2件・ToDo1件ある状態を作る */
  function stateWithTouched(): GuestState {
    const s = makeState(now);
    const [a, b] = s.tasks;
    const td = s.todos[0];
    s.touchedTaskIds = [a.id, b.id];
    s.touchedTodoIds = [td.id];
    s.deps = [
      {
        id: "dep-a-b",
        user_id: "guest",
        predecessor_id: a.id,
        successor_id: b.id,
        gap_minutes: 0,
        created_at: new Date(now).toISOString(),
      },
      ...s.deps.filter(
        (d) => d.predecessor_id !== a.id && d.successor_id !== b.id,
      ),
    ];
    return s;
  }

  it("指定した分だけを消し、指定していない分は残す", () => {
    const s = stateWithTouched();
    const keep = s.tasks[2].id;
    seed(s);

    guestStore.dropMigrated([s.tasks[0].id], []);

    const after = saved();
    expect(after.tasks.find((t) => t.id === s.tasks[0].id)).toBeUndefined();
    expect(after.tasks.find((t) => t.id === s.tasks[1].id)).toBeDefined();
    expect(after.tasks.find((t) => t.id === keep)).toBeDefined();
    expect(after.todos.find((t) => t.id === s.todos[0].id)).toBeDefined();
  });

  it("消した予定を指す依存関係も一緒に落とす", () => {
    const s = stateWithTouched();
    seed(s);

    guestStore.dropMigrated([s.tasks[0].id], []);

    expect(saved().deps.find((d) => d.id === "dep-a-b")).toBeUndefined();
  });

  it("引継ぎ済みの id は touched から外す（次回もう一度送らない）", () => {
    const s = stateWithTouched();
    seed(s);

    guestStore.dropMigrated([s.tasks[0].id], [s.todos[0].id]);

    const after = saved();
    expect(after.touchedTaskIds).toEqual([s.tasks[1].id]);
    expect(after.touchedTodoIds).toEqual([]);
  });

  it("元デモの id は deletedDemo に積んで、再アンカーで復活させない", () => {
    const s = stateWithTouched();
    const demoTaskId = s.tasks.find((t) => t.id.startsWith("guest-task-"))!.id;
    const demoTodoId = s.todos.find((t) => t.id.startsWith("guest-todo-"))!.id;
    s.touchedTaskIds = [demoTaskId];
    s.touchedTodoIds = [demoTodoId];
    seed(s);

    guestStore.dropMigrated([demoTaskId], [demoTodoId]);

    const after = saved();
    expect(after.deletedDemoTaskIds).toContain(demoTaskId);
    expect(after.deletedDemoTodoIds).toContain(demoTodoId);

    // 実際に2週間後へ再アンカーしても戻ってこない
    const later = reanchorIfStale(after, now + 14 * DAY);
    expect(later.tasks.find((t) => t.id === demoTaskId)).toBeUndefined();
    expect(later.todos.find((t) => t.id === demoTodoId)).toBeUndefined();
  });

  it("2回呼んでも壊れない（deletedDemo が重複しない）", () => {
    const s = stateWithTouched();
    const demoTaskId = s.tasks.find((t) => t.id.startsWith("guest-task-"))!.id;
    seed(s);

    guestStore.dropMigrated([demoTaskId], []);
    guestStore.dropMigrated([demoTaskId], []);

    const after = saved();
    expect(
      after.deletedDemoTaskIds.filter((x) => x === demoTaskId),
    ).toHaveLength(1);
  });

  it("空配列なら何もしない（保存も走らない）", () => {
    const s = stateWithTouched();
    seed(s);
    const before = storage.getItem(KEY);

    guestStore.dropMigrated([], []);

    expect(storage.getItem(KEY)).toBe(before);
  });
});

describe("guestStore.load の防御", () => {
  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    guestStore.clear();
  });

  afterEach(() => {
    guestStore.clear();
    vi.unstubAllGlobals();
  });

  it("保存内容が壊れていても例外を出さず、デモから作り直す", () => {
    // 形は JSON として妥当だが tasks が配列でない。再アンカー中に
    // state.tasks.filter が落ちる → 以前はここで画面が真っ白になっていた。
    seed({ anchorMonday: 0, tasks: null, todos: null, deps: [] });

    expect(() => guestStore.tasks()).not.toThrow();
    expect(guestStore.tasks().length).toBeGreaterThan(0);
    expect(guestStore.todos().length).toBeGreaterThan(0);
  });

  it("JSON として読めない内容でも作り直す", () => {
    guestStore.clear();
    storage.setItem(KEY, "{壊れています");

    expect(() => guestStore.tasks()).not.toThrow();
    expect(guestStore.tasks().length).toBeGreaterThan(0);
  });
});
