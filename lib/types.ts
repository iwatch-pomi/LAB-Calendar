// ラボカレ 共有型定義（Supabase テーブルに対応）

export type ExperimentStatus = "planning" | "in_progress" | "done" | "failed";
export type TaskStatus = "planned" | "done" | "failed";

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
  task_id: string | null;
  sort_order: number;
  created_at: string;
}

/** ユーザーごとの機能フラグ（プロフィールの設定で切替） */
export interface FeatureFlags {
  /** 培養リネージュ記録（前培養・継代培養の相関） */
  culture_lineage?: boolean;
}

export interface UserSettings {
  user_id: string;
  features: FeatureFlags;
  updated_at: string;
}

/** 実験カラーのプリセット（淡いパステル） */
export const EXPERIMENT_PALETTE: Record<
  string,
  { bg: string; border: string; text: string; dot: string; soft: string }
> = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    text: "text-teal-800",
    dot: "bg-teal-500",
    soft: "bg-teal-100",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-800",
    dot: "bg-violet-500",
    soft: "bg-violet-100",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    dot: "bg-amber-500",
    soft: "bg-amber-100",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-800",
    dot: "bg-sky-500",
    soft: "bg-sky-100",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-800",
    dot: "bg-rose-500",
    soft: "bg-rose-100",
  },
};

export const PALETTE_KEYS = Object.keys(EXPERIMENT_PALETTE);

export function paletteFor(color: string | null | undefined) {
  return EXPERIMENT_PALETTE[color ?? "teal"] ?? EXPERIMENT_PALETTE.teal;
}
