// ラボカレ コア機能: 依存関係(DAG)に基づく自動リスケジュール。
// DB 非依存の純粋関数として実装し、vitest で検証可能にする。
// 時刻は epoch ミリ秒で扱う。稼働時間の判定は日本標準時(UTC+9, DST 無し)を
// 既定とし、tzOffsetMinutes で固定オフセットとして与える。

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN = 60 * 1000;

export interface RTask {
  id: string;
  start: number; // epoch ms
  end: number; // epoch ms
  equipmentId: string | null;
  isWait: boolean; // 培養/計算待ちブロックは稼働時間に縛られない
}

export interface RDep {
  predecessorId: string;
  successorId: string;
  gapMinutes: number; // 先行終了から後続開始までの最小間隔(培養/冷却などの待ち)
}

export interface WorkingHours {
  startHour: number; // 例: 8
  endHour: number; // 例: 20
  skipWeekends: boolean;
}

export interface RescheduleOptions {
  now: number; // epoch ms（やり直しの最早基準）
  workingHours: WorkingHours;
  tzOffsetMinutes: number; // 既定 540 (= JST)
}

export interface Move {
  id: string;
  start: number;
  end: number;
}

export interface Interval {
  start: number;
  end: number;
  equipmentId: string | null;
}

// --- ローカル時刻ヘルパー（固定オフセット） ---

function localMidnight(ms: number, tz: number): number {
  const local = ms + tz * MIN;
  const d = new Date(local);
  const midnightLocal = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  return midnightLocal - tz * MIN; // ローカル深夜0時に対応する UTC epoch ms
}

function localDow(ms: number, tz: number): number {
  return new Date(ms + tz * MIN).getUTCDay(); // 0=日, 6=土
}

function isWeekend(ms: number, tz: number): boolean {
  const d = localDow(ms, tz);
  return d === 0 || d === 6;
}

function nextDayStart(ms: number, tz: number, wh: WorkingHours): number {
  return localMidnight(ms, tz) + DAY + wh.startHour * HOUR;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * earliest 以降で、稼働時間・装置の空きを満たす最早の開始時刻を返す。
 * isWait のタスクは稼働時間の制約を受けない（インキュベーション等）。
 */
export function findNextAvailableSlot(
  earliest: number,
  durationMs: number,
  equipmentId: string | null,
  busy: Interval[],
  wh: WorkingHours,
  tz: number,
  isWait: boolean,
): number {
  let candidate = earliest;
  const window = (wh.endHour - wh.startHour) * HOUR;

  for (let guard = 0; guard < 5000; guard++) {
    if (!isWait) {
      // 週末を飛ばす
      if (wh.skipWeekends && isWeekend(candidate, tz)) {
        candidate = nextDayStart(candidate, tz, wh);
        continue;
      }
      const midnight = localMidnight(candidate, tz);
      const startOfWork = midnight + wh.startHour * HOUR;
      const endOfWork = midnight + wh.endHour * HOUR;

      if (candidate < startOfWork) {
        candidate = startOfWork;
        continue;
      }
      const fitsInDay = durationMs <= window;
      if (
        candidate >= endOfWork ||
        (fitsInDay && candidate + durationMs > endOfWork)
      ) {
        candidate = nextDayStart(candidate, tz, wh);
        continue;
      }
    }

    // 装置の予約競合を解消
    if (equipmentId) {
      const conflict = busy
        .filter((b) => b.equipmentId === equipmentId)
        .filter((b) => overlaps(candidate, candidate + durationMs, b.start, b.end))
        .sort((a, b) => a.end - b.end)[0];
      if (conflict) {
        candidate = conflict.end;
        continue;
      }
    }

    return candidate;
  }
  return candidate; // フォールバック（通常到達しない）
}

/** failedId から前方（後続方向）に到達可能なタスク集合をトポロジカル順で返す。 */
export function forwardTopoOrder(
  deps: RDep[],
  failedId: string,
): string[] {
  const succ = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const d of deps) {
    if (!succ.has(d.predecessorId)) succ.set(d.predecessorId, []);
    succ.get(d.predecessorId)!.push(d.successorId);
  }

  // 到達可能集合
  const reachable = new Set<string>([failedId]);
  const stack = [failedId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const s of succ.get(cur) ?? []) {
      if (!reachable.has(s)) {
        reachable.add(s);
        stack.push(s);
      }
    }
  }

  // 到達可能集合内でのトポロジカルソート（Kahn 法）
  for (const id of reachable) indeg.set(id, 0);
  for (const d of deps) {
    if (reachable.has(d.predecessorId) && reachable.has(d.successorId)) {
      indeg.set(d.successorId, (indeg.get(d.successorId) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  // failedId を必ず先頭に
  for (const [id, deg] of indeg) if (deg === 0) queue.push(id);
  queue.sort((a, b) => (a === failedId ? -1 : b === failedId ? 1 : 0));

  const order: string[] = [];
  const localIndeg = new Map(indeg);
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const s of succ.get(cur) ?? []) {
      if (!reachable.has(s)) continue;
      const nd = (localIndeg.get(s) ?? 0) - 1;
      localIndeg.set(s, nd);
      if (nd === 0) queue.push(s);
    }
  }
  return order;
}

/**
 * 失敗タスクを起点に、後続タスク群を装置予約・稼働時間を考慮して
 * 最早の空き日程へ一括再配置する。
 * 返り値は移動したタスク(失敗タスクのやり直しを含む)の新しい時刻。
 */
export function rescheduleFromFailure(
  tasks: RTask[],
  deps: RDep[],
  failedId: string,
  opts: RescheduleOptions,
): Move[] {
  const { now, workingHours: wh, tzOffsetMinutes: tz } = opts;
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  if (!taskMap.has(failedId)) return [];

  const order = forwardTopoOrder(deps, failedId);
  const movedSet = new Set(order);

  // 各後続の先行タスクと gap
  const predsOf = new Map<string, { id: string; gap: number }[]>();
  for (const d of deps) {
    if (!predsOf.has(d.successorId)) predsOf.set(d.successorId, []);
    predsOf.get(d.successorId)!.push({ id: d.predecessorId, gap: d.gapMinutes });
  }

  // 装置の busy 区間: 移動しない既存タスクのみを初期集合とする
  const busy: Interval[] = tasks
    .filter((t) => !movedSet.has(t.id) && t.equipmentId)
    .map((t) => ({ start: t.start, end: t.end, equipmentId: t.equipmentId }));

  const newTimes = new Map<string, { start: number; end: number }>();
  const moves: Move[] = [];

  for (const id of order) {
    const task = taskMap.get(id)!;
    const duration = task.end - task.start;

    // 最早開始 = すべての先行の(新)終了 + gap の最大値
    let earliest = id === failedId ? now : now;
    for (const p of predsOf.get(id) ?? []) {
      const pt = newTimes.get(p.id) ?? taskMap.get(p.id);
      if (!pt) continue;
      const predEnd = pt.end;
      earliest = Math.max(earliest, predEnd + p.gap * MIN);
    }

    const start = findNextAvailableSlot(
      earliest,
      duration,
      task.equipmentId,
      busy,
      wh,
      tz,
      task.isWait,
    );
    const end = start + duration;
    newTimes.set(id, { start, end });
    moves.push({ id, start, end });
    if (task.equipmentId) {
      busy.push({ start, end, equipmentId: task.equipmentId });
    }
  }

  return moves;
}
