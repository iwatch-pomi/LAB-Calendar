"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useGuest } from "./GuestProvider";
import { useUpdateFeature } from "@/lib/queries";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
  { value: "system", label: "システム", icon: Monitor },
];

/**
 * ライト / ダーク / システム設定と同期、の3択セグメントコントロール。
 *
 * 表示はどこでも即座に切り替わる（ThemeProvider が localStorage で保持）。
 * ログイン中はアカウントにも保存し、他端末でも同じ設定になるようにする
 * （ゲストはアカウントが無いのでブラウザ内の保存のみ）。
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { isGuest } = useGuest();
  const updateFeature = useUpdateFeature();

  function choose(value: Theme) {
    setTheme(value);
    if (!isGuest) {
      updateFeature.mutate({ key: "theme", value });
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="配色"
      className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => choose(opt.value)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              active
                ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && opt.label}
          </button>
        );
      })}
    </div>
  );
}
