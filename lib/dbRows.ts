/**
 * DB の行を、アプリが使う型へ変換する境界。
 *
 * ラボカレは enum を使わず `text + check (... in (...))` で値を絞っている
 * （enum は値を1つ足すのに ALTER TYPE が要り、後戻りもしづらいため）。
 * ところが CHECK 制約は型として取り出せないので、自動生成された
 * `lib/database.types.ts` ではこれらの列が `string` になる。一方 UI 側は
 * `TaskStatus` などのユニオンで switch を書いている。その差をここで埋める。
 *
 * 要点は**絞る列だけを as で通し、残りはスプレッドで持ち上げる**こと。
 * 戻り値の型が `Task` なので、DB の列名を変えて DB側だけ直した場合は
 * 「プロパティが足りない」として**ここでビルドが止まる**。
 * `data as Task[]` と一括でキャストしてしまうと、その検査ごと消える。
 */

import type { Database } from "@/lib/database.types";
import type {
  CalendarShare,
  Experiment,
  LabMember,
  LabRole,
  ShareInvitation,
  SharePermission,
  ShareScope,
  Task,
  TaskKind,
  TaskStatus,
  ExperimentStatus,
} from "@/lib/types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export function toTask(r: Row<"tasks">): Task {
  return {
    ...r,
    status: r.status as TaskStatus,
    task_kind: r.task_kind as TaskKind,
  };
}

export function toExperiment(r: Row<"experiments">): Experiment {
  return { ...r, status: r.status as ExperimentStatus };
}

export function toLabMember(r: Row<"lab_members">): LabMember {
  return { ...r, role: r.role as LabRole };
}

export function toCalendarShare(r: Row<"calendar_shares">): CalendarShare {
  return {
    ...r,
    scope: r.scope as ShareScope,
    permission: r.permission as SharePermission,
  };
}

export function toShareInvitation(r: Row<"share_invitations">): ShareInvitation {
  return {
    ...r,
    scope: r.scope as ShareScope,
    permission: r.permission as SharePermission,
  };
}
