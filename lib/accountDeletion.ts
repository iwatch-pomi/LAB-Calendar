/**
 * 退会の猶予期間まわりの表示ロジック。
 *
 * 猶予の日数（7日）は**DB側だけが持つ**。`request_account_deletion()` が
 * `now() + interval '7 days'` を計算して `deletion_scheduled_at` に入れ、
 * こちらはその日時を受け取って表示するだけにしてある。
 * 日数を両方に書くと、片方だけ変えたときに画面とDBの説明がズレる。
 *
 * DOM にもDBにも依存しない純粋関数なのでテストで固める。
 */

/** 画面の文言で使う猶予日数。判定には使わない（判定はDBの日時が正） */
export const DELETION_GRACE_DAYS = 7;

/** 日本時間の1日をミリ秒で */
const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 削除予定日までの残り日数。
 *
 * 「あと0日」は出さない（当日でも1日と数える）。実際に消えるのは予定日時を
 * 過ぎてから最初の定期実行なので、少なめに見せて焦らせるより、
 * 残っているうちは1日以上と表示するほうが実態に近い。
 * 予定日時を過ぎていれば 0 を返す。
 */
export function daysUntilDeletion(
  scheduledAtISO: string,
  nowMs: number,
): number {
  const target = new Date(scheduledAtISO).getTime();
  if (!Number.isFinite(target)) return 0;
  const diff = target - nowMs;
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / DAY_MS));
}

/** 予定日時を過ぎているか（過ぎていれば、次の定期実行で削除される） */
export function isDeletionDue(scheduledAtISO: string, nowMs: number): boolean {
  const target = new Date(scheduledAtISO).getTime();
  if (!Number.isFinite(target)) return false;
  return target <= nowMs;
}

/**
 * 「8月14日(金)」の形にする。日本時間で表示する
 * （このアプリは時刻表示を Asia/Tokyo 固定にしている。lib/calendar.ts と同じ方針）。
 */
export function formatDeletionDate(scheduledAtISO: string): string {
  const t = new Date(scheduledAtISO).getTime();
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + JST_OFFSET_MS);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${w})`;
}
