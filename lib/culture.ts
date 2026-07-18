// 培地（culture_media）のステータス判定と日付ユーティリティ。
// カレンダー同様、ブラウザのタイムゾーンに依存せず Asia/Tokyo(UTC+9) 基準で計算する。

import type { CultureMedium } from "./types";

const TZ = 540 * 60 * 1000; // JST offset ms

/** 期限切れ「間近」とみなす日数（作成〜期限のうち残りこの日数以内） */
export const NEAR_EXPIRY_DAYS = 3;

export type CultureStatus = "culturing" | "near" | "expired" | "disposed";

export const CULTURE_STATUS_META: Record<
  CultureStatus,
  { label: string; text: string; bg: string; dot: string; bar: string }
> = {
  culturing: {
    label: "培養中",
    text: "text-emerald-700",
    bg: "bg-emerald-100",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400",
  },
  near: {
    label: "期限切れ間近",
    text: "text-amber-700",
    bg: "bg-amber-100",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
  },
  expired: {
    label: "期限切れ",
    text: "text-rose-700",
    bg: "bg-rose-100",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
  },
  disposed: {
    label: "廃棄済み",
    text: "text-gray-500",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
    bar: "bg-gray-300",
  },
};

/** JST の「今日」を "YYYY-MM-DD" で返す */
export function todayJst(): string {
  const s = new Date(Date.now() + TZ);
  return isoDate(s);
}

/** Date(UTCずらし済み) → "YYYY-MM-DD" */
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** "YYYY-MM-DD" の日付差（b - a）を日数で返す */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const au = Date.UTC(ay, am - 1, ad);
  const bu = Date.UTC(by, bm - 1, bd);
  return Math.round((bu - au) / (24 * 60 * 60 * 1000));
}

/** "YYYY-MM-DD" → "M/D" 表示 */
export function fmtMd(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

/** 培地の現在ステータスを判定する（today 省略時は JST 今日） */
export function cultureStatus(
  m: CultureMedium,
  today: string = todayJst(),
): CultureStatus {
  if (m.disposed_date) return "disposed";
  if (!m.expiry_date) return "culturing";
  const remaining = daysBetween(today, m.expiry_date); // 期限まであと何日
  if (remaining < 0) return "expired";
  if (remaining <= NEAR_EXPIRY_DAYS) return "near";
  return "culturing";
}
