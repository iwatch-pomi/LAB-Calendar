"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

interface ThemeContextValue {
  /** ユーザーが選んだ値（light / dark / system） */
  theme: Theme;
  /** 実際に画面へ適用されている色（system のときは OS の設定で決まる） */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage が使えない環境では既定にフォールバック
  }
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * ダークモードの適用先を示す目印。CalendarApp（/app）と TeacherDashboard
 * （/teacher）の一番外側の div だけに付ける。
 *
 * ダークモードの対象は「カレンダー画面と教授の管理画面」に限定されている。
 * .dark クラスを <html> に付けると Tailwind の dark: は祖先に .dark が
 * あるだけで効いてしまうため、ロゴなど複数画面で共有するコンポーネントに
 * dark: を足した瞬間、常にライト固定であるべき公式サイト（/）にまで
 * ダーク配色が漏れてしまう。それを避けるため、.dark は <html> ではなく
 * この目印を持つ要素にだけ付け外しする。
 */
export const THEME_ROOT_ATTR = "data-theme-root";

/**
 * ダークモードの状態管理。
 *
 * アカウントへの保存（ログイン後）はここでは行わない。GuestProvider の
 * ような画面ごとの文脈（ゲストかどうか）に依存させず、レイアウト直下の
 * どこからでも使えるようにするため、ここは localStorage だけで完結させる。
 * アカウントとの同期は `useThemeAccountSync`（lib/theme に対応する
 * useSettings が使える場所、CalendarApp と TeacherDashboard）が担う。
 *
 * 初回描画のちらつき対策は `app/layout.tsx` に置いた同期スクリプトが
 * 別途 `[data-theme-root]` のクラスを先に付けている。ここでの初期値も
 * ズレないよう同じ手順で localStorage を読む。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    systemPrefersDark(),
  );

  // OS のダーク設定が変わったら追従する（system 選択時のみ意味を持つ）
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefersDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = resolveTheme(theme, prefersDark);

  // [data-theme-root] の .dark クラスへ反映（/app /teacher の外枠のみ。
  // <html> には触れない＝公式サイトは常にライトのまま）
  useEffect(() => {
    const roots = document.querySelectorAll(`[${THEME_ROOT_ATTR}]`);
    roots.forEach((el) =>
      el.classList.toggle("dark", resolvedTheme === "dark"),
    );
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 容量超過などは黙って諦める（表示への反映自体は state で効く）
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
