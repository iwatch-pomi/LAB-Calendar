import { describe, it, expect } from "vitest";
import {
  rescheduleFromFailure,
  forwardTopoOrder,
  type RTask,
  type RDep,
  type WorkingHours,
} from "./reschedule";

const TZ = 540; // JST
const WH: WorkingHours = { startHour: 8, endHour: 20, skipWeekends: true };

// JST のローカル時刻から epoch ms を作る（UTC = local - 9h）
function jst(y: number, mo: number, d: number, h: number, mi = 0): number {
  return Date.UTC(y, mo - 1, d, h - 9, mi);
}

function task(
  id: string,
  start: number,
  end: number,
  opts: Partial<RTask> = {},
): RTask {
  return {
    id,
    start,
    end,
    equipmentId: opts.equipmentId ?? null,
    isWait: opts.isWait ?? false,
  };
}

function dep(p: string, s: string, gap = 0): RDep {
  return { predecessorId: p, successorId: s, gapMinutes: gap };
}

describe("forwardTopoOrder", () => {
  it("失敗タスクを先頭に、後続をトポロジカル順で返す", () => {
    const deps = [dep("A", "B"), dep("B", "C"), dep("C", "D")];
    expect(forwardTopoOrder(deps, "B")).toEqual(["B", "C", "D"]);
  });

  it("到達不能なタスクは含めない", () => {
    const deps = [dep("A", "B"), dep("X", "Y")];
    expect(forwardTopoOrder(deps, "A")).toEqual(["A", "B"]);
  });
});

describe("rescheduleFromFailure", () => {
  it("失敗→後続を隙間なく再配置する（基本カスケード）", () => {
    const tasks = [
      task("A", jst(2026, 7, 13, 9), jst(2026, 7, 13, 10)),
      task("B", jst(2026, 7, 13, 11), jst(2026, 7, 13, 12)),
      task("C", jst(2026, 7, 13, 13), jst(2026, 7, 13, 14)),
    ];
    const deps = [dep("A", "B"), dep("B", "C")];
    const moves = rescheduleFromFailure(tasks, deps, "A", {
      now: jst(2026, 7, 13, 9, 30),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    const m = Object.fromEntries(moves.map((x) => [x.id, x]));
    expect(m.A.start).toBe(jst(2026, 7, 13, 9, 30));
    expect(m.B.start).toBe(jst(2026, 7, 13, 10, 30));
    expect(m.C.start).toBe(jst(2026, 7, 13, 11, 30));
  });

  it("装置の予約競合を避けて後続をずらす", () => {
    const tasks = [
      task("A", jst(2026, 7, 13, 9), jst(2026, 7, 13, 10)),
      task("B", jst(2026, 7, 13, 11), jst(2026, 7, 13, 13), {
        equipmentId: "centrifuge",
      }),
      // 移動しない別タスクが遠心機を占有
      task("X", jst(2026, 7, 13, 10), jst(2026, 7, 13, 13), {
        equipmentId: "centrifuge",
      }),
    ];
    const deps = [dep("A", "B")];
    const moves = rescheduleFromFailure(tasks, deps, "A", {
      now: jst(2026, 7, 13, 9, 30),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    const m = Object.fromEntries(moves.map((x) => [x.id, x]));
    // A: 9:30-10:30, B earliest 10:30 だが遠心機は13:00まで占有→13:00開始
    expect(m.B.start).toBe(jst(2026, 7, 13, 13));
    expect(m.B.end).toBe(jst(2026, 7, 13, 15));
  });

  it("稼働時間を超える場合は翌営業日の開始時刻へ", () => {
    const tasks = [task("A", jst(2026, 7, 13, 19), jst(2026, 7, 13, 20))];
    const deps: RDep[] = [];
    const moves = rescheduleFromFailure(tasks, deps, "A", {
      now: jst(2026, 7, 13, 19, 30),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    // 19:30 + 1h = 20:30 > 20:00 → 翌日(火) 8:00
    expect(moves[0].start).toBe(jst(2026, 7, 14, 8));
  });

  it("待機ブロックは稼働時間に縛られず夜間も継続する", () => {
    const tasks = [
      task("A", jst(2026, 7, 13, 18), jst(2026, 7, 13, 19)),
      task("W", jst(2026, 7, 13, 19), jst(2026, 7, 14, 7), { isWait: true }), // 12h 培養
      task("C", jst(2026, 7, 14, 9), jst(2026, 7, 14, 10)),
    ];
    const deps = [dep("A", "W"), dep("W", "C")];
    const moves = rescheduleFromFailure(tasks, deps, "A", {
      now: jst(2026, 7, 13, 18),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    const m = Object.fromEntries(moves.map((x) => [x.id, x]));
    expect(m.A.start).toBe(jst(2026, 7, 13, 18));
    expect(m.W.start).toBe(jst(2026, 7, 13, 19)); // 待機は19:00開始
    expect(m.W.end).toBe(jst(2026, 7, 14, 7)); // 翌7:00まで
    // C は 7:00 開始候補だが稼働開始8:00へ繰り下げ
    expect(m.C.start).toBe(jst(2026, 7, 14, 8));
  });

  it("複数の先行タスクがある場合、最も遅い先行終了+gap に合わせる", () => {
    const tasks = [
      task("A", jst(2026, 7, 13, 9), jst(2026, 7, 13, 10)),
      // B は移動しない固定タスク（A の後続ではない）
      task("B", jst(2026, 7, 13, 14), jst(2026, 7, 13, 15)),
      task("D", jst(2026, 7, 13, 11), jst(2026, 7, 13, 12)),
    ];
    const deps = [dep("A", "D", 30), dep("B", "D", 0)];
    const moves = rescheduleFromFailure(tasks, deps, "A", {
      now: jst(2026, 7, 13, 9),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    const m = Object.fromEntries(moves.map((x) => [x.id, x]));
    // A: 9:00-10:00; A+gap30=10:30, B.end=15:00 → max=15:00
    expect(m.D.start).toBe(jst(2026, 7, 13, 15));
  });

  it("週末をスキップする", () => {
    // 2026-07-17 は金曜。19:30 失敗で翌日にずれると土日を飛ばして月曜へ
    const tasks = [task("A", jst(2026, 7, 17, 19), jst(2026, 7, 17, 20))];
    const moves = rescheduleFromFailure(tasks, [], "A", {
      now: jst(2026, 7, 17, 19, 30),
      workingHours: WH,
      tzOffsetMinutes: TZ,
    });
    // 20:30>20:00 → 翌日は土(18)→日(19)を飛ばして月(20) 8:00
    expect(moves[0].start).toBe(jst(2026, 7, 20, 8));
  });
});
