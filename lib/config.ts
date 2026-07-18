import type { WorkingHours } from "./reschedule";

// 稼働時間・タイムゾーンの既定値
export const WORKING_HOURS: WorkingHours = {
  startHour: 8,
  endHour: 20,
  skipWeekends: true,
};

export const TZ_OFFSET_MINUTES = 540; // JST (UTC+9)

// カレンダーの表示時間帯（週表示グリッド）
export const CAL_START_HOUR = 0;
export const CAL_END_HOUR = 24;

// 通常の活動時間の既定値（設定で変更可・週表示に太線を引く）
export const DEFAULT_WORK_START_HOUR = 8;
export const DEFAULT_WORK_END_HOUR = 20;
