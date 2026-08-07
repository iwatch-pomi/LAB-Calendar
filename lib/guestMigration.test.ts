import { describe, it, expect } from "vitest";
import { migrateGuestData, type MigrationIO } from "./guestMigration";
import { buildGuestDemo } from "./guestData";

const demo = buildGuestDemo(Date.UTC(2026, 5, 1));

function tasks(n: number) {
  return demo.tasks.slice(0, n);
}
function todos(n: number) {
  return demo.todos.slice(0, n);
}

/** 呼び出しを記録し、指定したタイトルのときだけ失敗する偽の書き込み先 */
function fakeIO(failTitles: string[] = []) {
  const taskCalls: string[] = [];
  const todoCalls: { title: string; sort_order: number }[] = [];
  const io: MigrationIO = {
    async createTask(a) {
      if (failTitles.includes(a.title)) throw new Error("insert failed");
      taskCalls.push(a.title);
    },
    async addTodo(a) {
      if (failTitles.includes(a.title)) throw new Error("insert failed");
      todoCalls.push({ title: a.title, sort_order: a.sort_order });
    },
  };
  return { io, taskCalls, todoCalls };
}

describe("migrateGuestData", () => {
  it("全件成功したら失敗0件で、全ての id を返す", async () => {
    const { io, taskCalls, todoCalls } = fakeIO();
    const r = await migrateGuestData({ tasks: tasks(3), todos: todos(2) }, io);

    expect(r.failed).toBe(0);
    expect(r.okTaskIds).toEqual(tasks(3).map((t) => t.id));
    expect(r.okTodoIds).toEqual(todos(2).map((t) => t.id));
    expect(taskCalls).toHaveLength(3);
    expect(todoCalls).toHaveLength(2);
  });

  it("途中の予定が失敗しても残りを続行し、成功した id だけを返す", async () => {
    const target = tasks(3);
    const { io } = fakeIO([target[1].title]);
    const r = await migrateGuestData({ tasks: target, todos: [] }, io);

    expect(r.failed).toBe(1);
    expect(r.okTaskIds).toEqual([target[0].id, target[2].id]);
    // 失敗した1件の id は返らない（＝呼び出し側はブラウザから消さない）
    expect(r.okTaskIds).not.toContain(target[1].id);
  });

  it("ToDo が失敗しても、予定の成功は取り消されない", async () => {
    const t = tasks(2);
    const td = todos(2);
    const { io } = fakeIO(td.map((x) => x.title));
    const r = await migrateGuestData({ tasks: t, todos: td }, io);

    expect(r.okTaskIds).toEqual(t.map((x) => x.id));
    expect(r.okTodoIds).toEqual([]);
    expect(r.failed).toBe(2);
  });

  it("全件失敗したら成功0件・失敗が全件（バーを出す条件になる）", async () => {
    const t = tasks(2);
    const td = todos(1);
    const { io } = fakeIO([...t, ...td].map((x) => x.title));
    const r = await migrateGuestData({ tasks: t, todos: td }, io);

    expect(r.okTaskIds).toEqual([]);
    expect(r.okTodoIds).toEqual([]);
    expect(r.failed).toBe(3);
  });

  it("空入力なら何も呼ばない", async () => {
    const { io, taskCalls, todoCalls } = fakeIO();
    const r = await migrateGuestData({ tasks: [], todos: [] }, io);

    expect(r).toEqual({ okTaskIds: [], okTodoIds: [], failed: 0 });
    expect(taskCalls).toHaveLength(0);
    expect(todoCalls).toHaveLength(0);
  });

  it("ToDo の sort_order は失敗しても詰まらない（元の並び順を保つ）", async () => {
    const td = todos(3);
    const { io, todoCalls } = fakeIO([td[1].title]);
    await migrateGuestData({ tasks: [], todos: td }, io);

    expect(todoCalls.map((c) => c.sort_order)).toEqual([1000, 1002]);
  });

  it("ゲストの実験idはサーバーに無いので単発の予定として保存する", async () => {
    const withExp = demo.tasks.filter((t) => t.experiment_id !== null);
    expect(withExp.length).toBeGreaterThan(0); // 前提が崩れたら気付けるように

    const seen: (string | null)[] = [];
    const io: MigrationIO = {
      async createTask(a) {
        seen.push(a.experiment_id);
      },
      async addTodo() {},
    };
    await migrateGuestData({ tasks: withExp, todos: [] }, io);

    expect(seen.every((x) => x === null)).toBe(true);
  });
});
