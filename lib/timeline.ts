/**
 * 研究室タイムライン（人ごとに1行・横に日付）のバー配置計算。
 *
 * 描画から切り離して純粋関数にしてある。ここは表示期間との重なり判定と
 * レーン（段）の割り当てという、目で見て正しさを確かめにくい部分なので、
 * DOM を介さずテストで固めたい。
 */

import type { Task } from "./types";

export interface TimelineBar {
  task: Task;
  /** 同じ人の行の中で何段目に置くか（0始まり） */
  lane: number;
  /** トラック幅に対する左端の位置（0-100） */
  leftPct: number;
  /** トラック幅に対する幅（0-100） */
  widthPct: number;
  /** 表示期間より前から続いている（左端で切れている） */
  clippedLeft: boolean;
  /** 表示期間より後ろまで続く（右端で切れている） */
  clippedRight: boolean;
}

export interface TimelineRow {
  bars: TimelineBar[];
  /** 必要な段数。行の高さを決めるのに使う。予定が無くても 1 を返す */
  laneCount: number;
}

/**
 * 1人ぶんの予定を、表示期間 [windowStart, windowEnd) 用のバーに変換する。
 *
 * ■ 期間の判定は「重なり」で行う
 * 「開始が期間内」だけで絞ると、**期間より前に始まって期間内に続いている予定**が
 * 消える。培養のように何日もまたがる工程では普通に起きるので、
 * start < windowEnd かつ end > windowStart で判定する。
 *
 * ■ レーン
 * 開始順に見て、「その段の最後の予定が既に終わっている」最初の段へ入れる。
 * 空いている段が無ければ新しい段を作る。これで重なる予定が潰し合わない。
 * 前の終わりと次の始まりが同時刻なら重なっていないので同じ段に載る。
 */
export function layoutTimelineRow(
  tasks: Task[],
  windowStart: number,
  windowEnd: number,
): TimelineRow {
  const span = windowEnd - windowStart;
  if (span <= 0) return { bars: [], laneCount: 1 };

  const inRange = tasks
    .map((task) => {
      const start = new Date(task.start_time).getTime();
      const end = new Date(task.end_time).getTime();
      return { task, start, end };
    })
    // 開始・終了が壊れている行は捨てる（NaN を混ぜると位置計算が全部壊れる）
    .filter((t) => Number.isFinite(t.start) && Number.isFinite(t.end))
    .filter((t) => t.start < windowEnd && t.end > windowStart)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  /** 各段の「最後に置いた予定の終わり」。クランプ後の値で持つ */
  const laneEnds: number[] = [];
  const bars: TimelineBar[] = [];

  for (const { task, start, end } of inRange) {
    const s = Math.max(start, windowStart);
    const e = Math.min(end, windowEnd);
    // 期間の端にちょうど接しているだけの予定は幅0になるので置かない
    if (s >= e) continue;

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else {
      laneEnds[lane] = e;
    }

    bars.push({
      task,
      lane,
      leftPct: ((s - windowStart) / span) * 100,
      widthPct: ((e - s) / span) * 100,
      clippedLeft: start < windowStart,
      clippedRight: end > windowEnd,
    });
  }

  return { bars, laneCount: Math.max(1, laneEnds.length) };
}
