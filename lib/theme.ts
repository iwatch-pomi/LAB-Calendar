/**
 * ダークモードの状態管理まわり。
 *
 * 「ライト / ダーク / システム設定と同期」の3択を持ち、実際に画面へ適用する
 * 色（resolvedTheme）はシステム設定を絡めて決まる。判定ロジックは DOM にも
 * DB にも依存しない純粋関数にして、テストで固める。
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** ゲスト・ログイン後の初回描画キャッシュ両方に使う localStorage キー */
export const THEME_STORAGE_KEY = "labocale.theme";

const THEMES: readonly Theme[] = ["light", "dark", "system"];

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** 選択中の theme と OS のダーク設定から、実際に適用する色を決める */
export function resolveTheme(
  theme: Theme,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
