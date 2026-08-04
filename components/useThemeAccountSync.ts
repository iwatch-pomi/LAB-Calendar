"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/queries";
import { isValidTheme } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

/**
 * ログイン済みアカウントに保存されているテーマを、初回だけ適用する。
 *
 * ThemeProvider はレイアウト直下（ゲストか判定できない場所）にあるため
 * localStorage だけで完結させてあり、アカウントとの同期はここで別途行う。
 * アカウント側を「他端末でも同じ設定」の正として扱い、ローカルのキャッシュ
 * より優先する。以後のユーザー操作による保存は ThemeToggle が個別に行う
 * ので、ここでは1回適用したら終わり（ずっと監視して上書きし続けると、
 * ユーザーがその場で切り替えた直後に元へ戻ってしまう）。
 *
 * CalendarApp（ゲスト/ログイン両対応）と TeacherDashboard（常にログイン
 * 済み）の両方から呼ぶ。ゲストは user_settings を持たないため
 * settingsQ.data?.theme は常に undefined で、実質何もしない。
 */
export function useThemeAccountSync() {
  const settingsQ = useSettings();
  const { theme, setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !settingsQ.isSuccess) return;
    applied.current = true;
    const accountTheme = settingsQ.data?.theme;
    if (isValidTheme(accountTheme) && accountTheme !== theme) {
      setTheme(accountTheme);
    }
    // theme はここでは意図的に依存配列から外す（初回適用の判定にのみ使う）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQ.isSuccess, settingsQ.data?.theme, setTheme]);
}
