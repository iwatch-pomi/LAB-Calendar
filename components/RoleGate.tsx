"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGuest } from "./GuestProvider";
import { useSettings, useUpdateFeatures } from "@/lib/queries";
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

  function choose(teacher: boolean) {
    updateFeatures.mutate({ role_chosen: true, is_teacher: teacher });
    setDismissed(true);
    // 教授はカレンダーを使わないので管理画面へ、学生はその場に留まる
    if (teacher) router.replace(TEACHER_HOME);
    else if (window.location.pathname.startsWith(TEACHER_HOME))
      router.replace(DEFAULT_AFTER_LOGIN);
  }

  return (
    <RoleChoiceModal
      initial={initial}
      saving={updateFeatures.isPending}
      onChoose={choose}
      onDismiss={() => setDismissed(true)}
    />
  );
}
