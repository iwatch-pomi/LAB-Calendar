// カレンダー用の日付ユーティリティ。
// ブラウザのタイムゾーンに依存せず、常に Asia/Tokyo(UTC+9, DST無し)の
// 壁時計で計算する（スケジューラと一貫）。

const TZ = 540 * 60 * 1000; // JST offset ms
export const DAY = 24 * 60 * 60 * 1000;

export const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

/** epoch ms を Tokyo 壁時計に「ずらした」Date。getUTC* で各要素を読む。 */
function shift(ms: number): Date {
  return new Date(ms + TZ);
}

export function tokyoMidnightMs(ms: number): number {
  const s = shift(ms);
  const mid = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  return mid - TZ;
}

export function tokyoDow(ms: number): number {
  return shift(ms).getUTCDay(); // 0=日..6=土
}

export function weekStartMs(refMs: number): number {
  const mid = tokyoMidnightMs(refMs);
  const dow = tokyoDow(refMs);
  const mondayOffset = (dow + 6) % 7; // 月曜始まり
  return mid - mondayOffset * DAY;
}

export interface DayCell {
  index: number;
  startMs: number; // Tokyo 深夜0時の UTC ms
  dateNum: number;
  month: number; // 1-12
  weekdayJp: string;
  isToday: boolean;
  isWeekend: boolean;
}

export function buildWeek(refMs: number, nowMs: number): DayCell[] {
  return buildRange(refMs, nowMs, 7);
}

/**
 * 表示日数分の DayCell を返す。
 * 7日以上は週（月曜始まり）を基準、それ未満は refMs の当日を起点とする
 * スライディングウィンドウ（スマホの3日表示など）。
 */
export function buildRange(
  refMs: number,
  nowMs: number,
  count: number,
): DayCell[] {
  const start = count >= 7 ? weekStartMs(refMs) : tokyoMidnightMs(refMs);
  const todayMid = tokyoMidnightMs(nowMs);
  const cells: DayCell[] = [];
  for (let i = 0; i < count; i++) {
    const startMs = start + i * DAY;
    const s = shift(startMs);
    const dow = s.getUTCDay();
    cells.push({
      index: i,
      startMs,
      dateNum: s.getUTCDate(),
      month: s.getUTCMonth() + 1,
      weekdayJp: WEEKDAY_JP[dow],
      isToday: startMs === todayMid,
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return cells;
}

/** タスク開始からその日の深夜0時までの経過分 */
export function minutesFromMidnight(ms: number): number {
  return (ms - tokyoMidnightMs(ms)) / 60000;
}

export function fmtTime(ms: number): string {
  const s = shift(ms);
  const h = s.getUTCHours();
  const m = s.getUTCMinutes();
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function fmtTimeRange(startMs: number, endMs: number): string {
  return `${fmtTime(startMs)}–${fmtTime(endMs)}`;
}

/** ヘッダー用: "2026年7月13 – 19" のような週レンジ */
export function fmtWeekRange(cells: DayCell[]): string {
  const first = cells[0];
  const last = cells[cells.length - 1];
  const y = shift(first.startMs).getUTCFullYear();
  if (first.month === last.month) {
    return `${y}年${first.month}月${first.dateNum} – ${last.dateNum}`;
  }
  return `${y}年${first.month}月${first.dateNum} – ${last.month}月${last.dateNum}`;
}

export function fmtMonthTitle(refMs: number): string {
  const s = shift(refMs);
  return `${s.getUTCFullYear()}年${s.getUTCMonth() + 1}月`;
}

/** 月表示用: その月を含む週(月曜始まり)で埋めた 6週 x 7日 のグリッド */
export function buildMonthGrid(refMs: number, nowMs: number): DayCell[][] {
  const s = shift(refMs);
  const firstOfMonth = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1) - TZ;
  const gridStart = weekStartMs(firstOfMonth);
  const todayMid = tokyoMidnightMs(nowMs);
  const curMonth = s.getUTCMonth() + 1;
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const startMs = gridStart + (w * 7 + d) * DAY;
      const cell = shift(startMs);
      const dow = cell.getUTCDay();
      row.push({
        index: w * 7 + d,
        startMs,
        dateNum: cell.getUTCDate(),
        month: cell.getUTCMonth() + 1,
        weekdayJp: WEEKDAY_JP[dow],
        isToday: startMs === todayMid,
        isWeekend: dow === 0 || dow === 6,
      });
    }
    weeks.push(row);
  }
  // 現在月を含まない末尾週は落とす（最大6週→必要分）
  return weeks.filter((week) => week.some((c) => c.month === curMonth));
}

export function nowMs(): number {
  return Date.now();
}

/** ISO(UTC) → datetime-local 入力値 "YYYY-MM-DDThh:mm"（JST 壁時計） */
export function isoToJstInput(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + TZ);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${jst.getUTCFullYear()}-${p(jst.getUTCMonth() + 1)}-${p(
    jst.getUTCDate(),
  )}T${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}`;
}

/** datetime-local 入力値("YYYY-MM-DDThh:mm", JST壁時計) → ISO(UTC) */
export function jstInputToISO(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString();
}
