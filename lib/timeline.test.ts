import { describe, it, expect } from "vitest";
import { layoutTimelineRow } from "./timeline";
import type { Task } from "./types";

/** JST のローカル時刻から epoch ms（他のテストと同じ流儀） */
function jst(y: number, mo: number, d: number, h = 0, mi = 0): number {
  return Date.UTC(y, mo - 1, d, h - 9, mi);
}

let seq = 0;
function task(startMs: number, endMs: number, title = "実験"): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    user_id: "u1",
    experiment_id: null,
    title,
    subtitle: null,
    start_time: new Date(startMs).toISOString(),
    end_time: new Date(endMs).toISOString(),
    status: "planned",
    equipment_id: null,
    needs_reservation: false,
    is_wait: false,
    task_kind: "operation",
    template_step_id: null,
    notes: null,
    created_at: new Date(startMs).toISOString(),
  };
}

// 表示期間は 8/3(月) 00:00 から 7日間
const WIN_START = jst(2026, 8, 3);
const WIN_END = jst(2026, 8, 10);

describe("layoutTimelineRow: 表示期間との重なり", () => {
  it("期間内にすっぽり入る予定を置く", () => {
    const { bars } = layoutTimelineRow(
      [task(jst(2026, 8, 4), jst(2026, 8, 6))],
      WIN_START,
      WIN_END,
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].clippedLeft).toBe(false);
    expect(bars[0].clippedRight).toBe(false);
    // 7日のうち 1日目から2日ぶん
    expect(bars[0].leftPct).toBeCloseTo((1 / 7) * 100, 5);
    expect(bars[0].widthPct).toBeCloseTo((2 / 7) * 100, 5);
  });

  it("期間より前に始まって期間内に続く予定を落とさない（培養などで必ず起きる）", () => {
    const { bars } = layoutTimelineRow(
      [task(jst(2026, 7, 30), jst(2026, 8, 5))],
      WIN_START,
      WIN_END,
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].clippedLeft).toBe(true);
    expect(bars[0].clippedRight).toBe(false);
    expect(bars[0].leftPct).toBe(0);
    expect(bars[0].widthPct).toBeCloseTo((2 / 7) * 100, 5);
  });

  it("期間より後ろまで続く予定は右端で切る", () => {
    const { bars } = layoutTimelineRow(
      [task(jst(2026, 8, 8), jst(2026, 8, 20))],
      WIN_START,
      WIN_END,
    );
    expect(bars[0].clippedRight).toBe(true);
    expect(bars[0].leftPct + bars[0].widthPct).toBeCloseTo(100, 5);
  });

  it("期間をまたいで完全に覆う予定は全幅になる", () => {
    const { bars } = layoutTimelineRow(
      [task(jst(2026, 7, 1), jst(2026, 9, 1))],
      WIN_START,
      WIN_END,
    );
    expect(bars[0].leftPct).toBe(0);
    expect(bars[0].widthPct).toBe(100);
    expect(bars[0].clippedLeft).toBe(true);
    expect(bars[0].clippedRight).toBe(true);
  });

  it("期間の完全に外にある予定は出さない", () => {
    const { bars } = layoutTimelineRow(
      [
        task(jst(2026, 7, 1), jst(2026, 7, 2)),
        task(jst(2026, 9, 1), jst(2026, 9, 2)),
      ],
      WIN_START,
      WIN_END,
    );
    expect(bars).toHaveLength(0);
  });

  it("期間の端に接しているだけの予定は幅0になるので出さない", () => {
    const { bars } = layoutTimelineRow(
      [
        // 期間の開始ちょうどで終わる
        task(jst(2026, 8, 1), WIN_START),
        // 期間の終わりちょうどに始まる
        task(WIN_END, jst(2026, 8, 12)),
      ],
      WIN_START,
      WIN_END,
    );
    expect(bars).toHaveLength(0);
  });

  it("日時が壊れている行は捨てる", () => {
    const broken = { ...task(WIN_START, WIN_END), start_time: "むちゃくちゃ" };
    const { bars } = layoutTimelineRow([broken], WIN_START, WIN_END);
    expect(bars).toHaveLength(0);
  });
});

describe("layoutTimelineRow: レーン割り当て", () => {
  it("重なる2件は別の段に置く", () => {
    const { bars, laneCount } = layoutTimelineRow(
      [
        task(jst(2026, 8, 4), jst(2026, 8, 7), "A"),
        task(jst(2026, 8, 5), jst(2026, 8, 8), "B"),
      ],
      WIN_START,
      WIN_END,
    );
    expect(laneCount).toBe(2);
    expect(bars.map((b) => b.lane).sort()).toEqual([0, 1]);
  });

  it("前の終わりと次の始まりが同時刻なら重なっていないので同じ段に載せる", () => {
    const { bars, laneCount } = layoutTimelineRow(
      [
        task(jst(2026, 8, 4), jst(2026, 8, 6), "A"),
        task(jst(2026, 8, 6), jst(2026, 8, 8), "B"),
      ],
      WIN_START,
      WIN_END,
    );
    expect(laneCount).toBe(1);
    expect(bars.every((b) => b.lane === 0)).toBe(true);
  });

  it("空いた段を使い回す（3件目が1件目の後ろなら段を増やさない）", () => {
    const { laneCount } = layoutTimelineRow(
      [
        task(jst(2026, 8, 3), jst(2026, 8, 5), "A"),
        task(jst(2026, 8, 4), jst(2026, 8, 9), "B"), // A と重なる → 2段目
        task(jst(2026, 8, 6), jst(2026, 8, 8), "C"), // A の後ろ → 1段目に戻れる
      ],
      WIN_START,
      WIN_END,
    );
    expect(laneCount).toBe(2);
  });

  it("3件すべてが重なれば3段になる", () => {
    const { laneCount } = layoutTimelineRow(
      [
        task(jst(2026, 8, 4), jst(2026, 8, 9), "A"),
        task(jst(2026, 8, 5), jst(2026, 8, 9), "B"),
        task(jst(2026, 8, 6), jst(2026, 8, 9), "C"),
      ],
      WIN_START,
      WIN_END,
    );
    expect(laneCount).toBe(3);
  });

  it("予定が無くても段数は1（行の高さが0にならないように）", () => {
    expect(layoutTimelineRow([], WIN_START, WIN_END).laneCount).toBe(1);
  });

  it("表示期間が不正なら何も返さない", () => {
    const { bars, laneCount } = layoutTimelineRow(
      [task(jst(2026, 8, 4), jst(2026, 8, 6))],
      WIN_END,
      WIN_START,
    );
    expect(bars).toHaveLength(0);
    expect(laneCount).toBe(1);
  });
});
