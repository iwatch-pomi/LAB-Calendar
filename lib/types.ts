// ラボカレ 共有型定義（Supabase テーブルに対応）

export type ExperimentStatus = "planning" | "in_progress" | "done" | "failed";
export type TaskStatus = "planned" | "done" | "failed";
/** 予定の種別: 実験操作 / 待機時間 / 培養時間 */
export type TaskKind = "operation" | "wait" | "culture";

export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  estimated_label: string | null;
  total_steps: number;
  color: string;
  created_at: string;
}

export interface TemplateStep {
  id: string;
  template_id: string;
  step_order: number;
  title: string;
  subtitle: string | null;
  offset_from_prev_minutes: number;
  duration_minutes: number;
  wait_after_minutes: number;
  equipment_name: string | null;
  needs_reservation: boolean;
}

export interface Experiment {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  status: ExperimentStatus;
  current_step: number;
  total_steps: number;
  color: string;
  archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  experiment_id: string | null;
  title: string;
  subtitle: string | null;
  start_time: string; // ISO
  end_time: string; // ISO
  status: TaskStatus;
  equipment_id: string | null;
  needs_reservation: boolean;
  is_wait: boolean;
  task_kind: TaskKind;
  template_step_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaskDependency {
  id: string;
  user_id: string;
  predecessor_id: string;
  successor_id: string;
  gap_minutes: number;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  completed_at: string | null;
  task_id: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * ユーザーごとの機能フラグ（プロフィールの設定で切替）。
 * 個別機能のキーは lib/features.ts の FEATURES で定義（例: bio_culture_lineage）。
 * 機能追加に強いよう任意の文字列キーを許可する。
 */
export interface FeatureFlags {
  /** 初回オンボーディング（研究分野の選択）完了フラグ */
  onboarded?: boolean;
  /** カレンダーの週の開始曜日（0=日曜, 1=月曜）。既定は月曜。 */
  week_start_day?: 0 | 1;
  [key: string]: boolean | number | undefined;
}

export interface UserSettings {
  user_id: string;
  features: FeatureFlags;
  updated_at: string;
}

/** 培地（継代培養を管理ページで扱う独立エンティティ） */
export interface CultureMedium {
  id: string;
  user_id: string;
  name: string;
  created_date: string; // "YYYY-MM-DD"（作成日）
  expiry_date: string | null; // 期限日
  disposed_date: string | null; // 廃棄日
  parent_id: string | null; // 継代元（親培地）
  source_task_id: string | null; // 紐づく「培養時間」タスク
  note: string | null;
  created_at: string;
}

/** 実験カラーのプリセット（淡いパステル）。hatch は待機/培養ブロックの斜線用 RGB。 */
export const EXPERIMENT_PALETTE: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
    soft: string;
    hatch: string; // "R, G, B"（Tailwind の各色 500 相当）
  }
> = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    text: "text-teal-800",
    dot: "bg-teal-500",
    soft: "bg-teal-100",
    hatch: "13, 148, 136",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-800",
    dot: "bg-violet-500",
    soft: "bg-violet-100",
    hatch: "124, 58, 237",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    dot: "bg-amber-500",
    soft: "bg-amber-100",
    hatch: "217, 119, 6",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-800",
    dot: "bg-sky-500",
    soft: "bg-sky-100",
    hatch: "2, 132, 199",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-800",
    dot: "bg-rose-500",
    soft: "bg-rose-100",
    hatch: "225, 29, 72",
  },
};

/** 待機/培養ブロックの斜線背景（カレンダー色に準拠） */
export function hatchBackground(color: string | null | undefined): string {
  const rgb = paletteFor(color).hatch;
  return `repeating-linear-gradient(45deg, rgba(${rgb}, 0.14), rgba(${rgb}, 0.14) 8px, rgba(${rgb}, 0.04) 8px, rgba(${rgb}, 0.04) 16px)`;
}

export const PALETTE_KEYS = Object.keys(EXPERIMENT_PALETTE);

export function paletteFor(color: string | null | undefined) {
  return EXPERIMENT_PALETTE[color ?? "teal"] ?? EXPERIMENT_PALETTE.teal;
}
