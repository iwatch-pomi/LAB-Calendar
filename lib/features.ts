// 実験モードと、その中の個別機能の定義（レジストリ）。
// 機能を増やすときは FEATURES に1行追加し、対応するパネルを描画すればよい。

import type { FeatureFlagKey } from "@/lib/types";

export type ExperimentMode = "bio" | "chem" | "physics" | "engineering";

export interface ModeDef {
  key: ExperimentMode;
  title: string;
  /** アイコン背景/アクセントに使うTailwindの色名の一部 */
  accent: "emerald" | "blue" | "amber" | "slate";
}

export interface FeatureDef {
  /**
   * user_settings.features に保存するフラグキー。
   * FeatureFlags の実在するキーだけを許す（綴り違いを型検査で止めるため）。
   * 機能を増やすときは lib/types.ts の FeatureFlags にも1行足す。
   */
  key: FeatureFlagKey;
  mode: ExperimentMode;
  title: string;
  description: string;
}

export const MODES: ModeDef[] = [
  { key: "bio", title: "生物実験モード", accent: "emerald" },
  { key: "chem", title: "化学実験モード", accent: "blue" },
  { key: "physics", title: "物理実験モード", accent: "amber" },
  { key: "engineering", title: "工学実験モード", accent: "slate" },
];

export const FEATURES: FeatureDef[] = [
  {
    key: "bio_culture_lineage",
    mode: "bio",
    title: "継代培養の記録",
    description:
      "予定に「培養時間」を追加でき、培地の作成日・期限・継代系統を専用ページで管理します。",
  },
  {
    key: "chem_calc",
    mode: "chem",
    title: "収率・モル計算",
    description: "収率(%)とモル数を計算するツールを表示します。",
  },
  {
    key: "physics_stats",
    mode: "physics",
    title: "測定統計",
    description: "測定値の件数・平均・標準偏差・標準誤差を計算します。",
  },
  {
    key: "engineering_unit",
    mode: "engineering",
    title: "単位変換",
    description: "長さ・質量の単位を相互変換します。",
  },
];

export function featuresByMode(mode: ExperimentMode): FeatureDef[] {
  return FEATURES.filter((f) => f.mode === mode);
}
