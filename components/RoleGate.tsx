"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGuest } from "./GuestProvider";
import { useSettings, useUpdateFeatures, useUpdateRole } from "@/lib/queries";
import { shouldAskRole } from "@/lib/role";
import { TEACHER_HOME, DEFAULT_AFTER_LOGIN } from "@/lib/authRedirect";
import { RoleChoiceModal } from "./RoleChoiceModal";

/**
 * 初回ログイン時の利用形態（学生 / 教授）の確認。
 *
 * `/app` と `/teacher` の両方がマウントする。CalendarApp の中に置くと、
 * 教授の入口から入って `/teacher` に直行した人には一度も表示されない。
 */
export function RoleGate() {
  const router = useRouter();
  const { isGuest } = useGuest();
  const settingsQ = useSettings();
  const updateFeatures = useUpdateFeatures();
  const updateRole = useUpdateRole();
  const [dismissed, setDismissed] = useState(false);

  const ask =
    !dismissed &&
    shouldAskRole({
      isGuest,
      settingsLoaded: settingsQ.isSuccess,
      roleChosen: settingsQ.data?.role_chosen === true,
      onboarded: settingsQ.data?.onboarded === true,
    });

  if (!ask) return null;

  // 教授の入口から入った人は教授側を強調する
  const initial =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith(TEACHER_HOME)
      ? "teacher"
      : "student";

  async function choose(teacher: boolean) {
    // 遷移先はサーバーが user_settings を読んで判定する（/app は教授を弾く）。
    // 保存を待たずに遷移すると、サーバーがまだ古い役割を読んで元のページへ
    // 戻してしまい、しかも選択済み扱いでモーダルも出ないため詰む。必ず待つ。
    setDismissed(true);
    try {
      // 役割は専用カラム、「選択済み」の印は features。別々に保存する。
      await updateRole.mutateAsync(teacher ? "teacher" : "student");
      await updateFeatures.mutateAsync({ role_chosen: true });
    } catch {
      // 保存できなかったときは移動しない（行き先の判定が食い違うため）
      return;
    }
    // 教授はカレンダーを使わないので管理画面へ、学生はその場に留まる
    if (teacher) router.replace(TEACHER_HOME);
    else if (window.location.pathname.startsWith(TEACHER_HOME))
      router.replace(DEFAULT_AFTER_LOGIN);
  }

  return (
    <RoleChoiceModal
      initial={initial}
      saving={updateRole.isPending || updateFeatures.isPending}
      onChoose={choose}
      onDismiss={() => setDismissed(true)}
    />
  );
}
