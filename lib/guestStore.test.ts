import { describe, it, expect } from "vitest";
import { buildGuestDemo } from "./guestData";
import { reanchorIfStale, type GuestState } from "./guestStore";
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
