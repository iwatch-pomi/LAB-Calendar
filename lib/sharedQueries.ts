"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  CalendarShare,
  Equipment,
  Experiment,
  Lab,
  LabMember,
  ShareInvitation,
  SharePermission,
  ShareScope,
  Task,
  TaskComment,
  TaskDependency,
  VisibleProfile,
} from "@/lib/types";
import {
  toCalendarShare,
  toExperiment,
  toLabMember,
  toShareInvitation,
  toTask,
} from "@/lib/dbRows";

const supabase = createClient();

/**
 * 共有・研究室まわりのデータアクセス。
 *
 * 他人のカレンダーは「閲覧専用」なので、ここには予定を書き換えるフックを
 * 一切置かない（＝共有ビューから編集する経路が構造的に存在しない）。
 * 既存の lib/queries.ts は自分のデータ専用のまま触らない。
 *
 * `.eq("user_id", ownerId)` は RLS が最終防衛線である上での二重化。
 * 万一ポリシーを緩めてしまっても、別人の行が混ざらないようにしておく。
 */

export const sqk = {
  labs: ["shared", "labs"] as const,
  labMembers: (labId: string) => ["shared", "lab_members", labId] as const,
  myShares: ["shared", "my_shares"] as const,
  incomingShares: ["shared", "incoming_shares"] as const,
  invitations: ["shared", "invitations"] as const,
  profiles: ["shared", "profiles"] as const,
  experiments: (ownerId: string) => ["shared", "experiments", ownerId] as const,
  tasks: (ownerId: string) => ["shared", "tasks", ownerId] as const,
  deps: (ownerId: string) => ["shared", "deps", ownerId] as const,
  equipment: (ownerId: string) => ["shared", "equipment", ownerId] as const,
  comments: (taskId: string) => ["shared", "comments", taskId] as const,
  /**
   * 研究室タイムライン用。1人用の tasks(ownerId) とは別のキーにしてある。
   * 対象者が変わればキーも変わるよう、id を並べ替えて連結して持つ
   * （メンバーが増減したときに古い結果を再利用してしまわないように）。
   */
  labTimelineTasks: (ownerIds: string[], fromMs: number, toMs: number) =>
    [
      "shared",
      "lab_timeline_tasks",
      [...ownerIds].sort().join(","),
      fromMs,
      toMs,
    ] as const,
  labTimelineExperiments: (ownerIds: string[]) =>
    ["shared", "lab_timeline_experiments", [...ownerIds].sort().join(",")] as const,
};

// ---------------- 名前の解決 ----------------

/** 表示してよい相手のプロフィール（visible_profiles RPC） */
export function useVisibleProfiles() {
  return useQuery({
    queryKey: sqk.profiles,
    queryFn: async (): Promise<VisibleProfile[]> => {
      const { data, error } = await supabase.rpc("visible_profiles");
      if (error) return [];
      return (data ?? []) as VisibleProfile[];
    },
  });
}

/** user_id → 表示名（無ければメール、それも無ければ「不明なユーザー」） */
export function profileLabel(p: VisibleProfile | undefined): string {
  if (!p) return "不明なユーザー";
  return p.display_name?.trim() || p.email || "不明なユーザー";
}

// ---------------- 研究室 ----------------

export function useMyLabs() {
  return useQuery({
    queryKey: sqk.labs,
    queryFn: async (): Promise<Lab[]> => {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .order("created_at");
      if (error) return [];
      return data ?? [];
    },
  });
}

export function useLabMembers(labId: string | null) {
  return useQuery({
    queryKey: sqk.labMembers(labId ?? "none"),
    enabled: !!labId,
    queryFn: async (): Promise<LabMember[]> => {
      if (!labId) return [];
      const { data, error } = await supabase
        .from("lab_members")
        .select("*")
        .eq("lab_id", labId)
        .order("joined_at");
      if (error) return [];
      return (data ?? []).map(toLabMember);
    },
  });
}

export function useCreateLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("create_lab", { p_name: name });
      if (error) throw error;
      return (data as string) ?? null;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.labs });
      qc.invalidateQueries({ queryKey: ["shared", "lab_members"] });
      qc.invalidateQueries({ queryKey: sqk.profiles });
    },
  });
}

export function useJoinLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("join_lab_by_code", {
        code,
      });
      if (error) throw error;
      return (data as string) ?? null;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.labs });
      qc.invalidateQueries({ queryKey: ["shared", "lab_members"] });
      qc.invalidateQueries({ queryKey: sqk.profiles });
    },
  });
}

/** 研究室にカレンダーを見せるかどうか（学生が自分で切り替える） */
export function useSetLabShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; share: boolean }) => {
      const { error } = await supabase
        .from("lab_members")
        .update({ share_calendar: args.share })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["shared", "lab_members"] }),
  });
}

/** 退会（自分の所属行を消す）／管理者がメンバーを外す */
export function useLeaveLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("lab_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.labs });
      qc.invalidateQueries({ queryKey: ["shared", "lab_members"] });
    },
  });
}

/**
 * 研究室そのものを削除する（主宰のみ。labs_write ポリシーが owner_id を
 * 検証する）。lab_members / 研究室あての calendar_shares は
 * on delete cascade で一緒に消える。
 */
export function useDeleteLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labId: string) => {
      const { error } = await supabase.from("labs").delete().eq("id", labId);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.labs });
      qc.invalidateQueries({ queryKey: ["shared", "lab_members"] });
      qc.invalidateQueries({ queryKey: sqk.profiles });
      qc.invalidateQueries({ queryKey: sqk.incomingShares });
    },
  });
}

// ---------------- 共有 ----------------

/** ログイン中のユーザーID */
export function useMyUserId() {
  return useQuery({
    queryKey: ["shared", "me"] as const,
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
  });
}

/**
 * 自分が誰かに渡している共有だけ。
 * calendar_shares は「持ち主」と「共有された側」の両方から読めるので、
 * 絞らないと相手からもらった共有まで「共有中」に混ざる。
 */
export function useMyShares() {
  const meQ = useMyUserId();
  const me = meQ.data ?? null;
  return useQuery({
    queryKey: [...sqk.myShares, me ?? "none"] as const,
    enabled: !!me,
    queryFn: async (): Promise<CalendarShare[]> => {
      if (!me) return [];
      const { data, error } = await supabase
        .from("calendar_shares")
        .select("*")
        .eq("owner_id", me)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []).map(toCalendarShare);
    },
  });
}

/**
 * 自分に「アカウント全体」を共有してくれている人の user_id 一覧。
 * 判定ロジックは RLS と同じ shared_owner_ids() をそのまま呼ぶ
 * （クライアント側で推測すると条件がずれるため）。
 */
export function useSharedWithMe() {
  return useQuery({
    queryKey: sqk.incomingShares,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc("shared_owner_ids");
      if (error) return [];
      // setof uuid はスカラーの配列で返る
      return ((data ?? []) as unknown[]).map((v) => String(v));
    },
  });
}

export function useShareByEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      email: string;
      scope: ShareScope;
      experimentId: string | null;
      permission: SharePermission;
    }): Promise<"shared" | "invited"> => {
      const { data, error } = await supabase.rpc("share_calendar_by_email", {
        target_email: args.email,
        p_scope: args.scope,
        // 「アカウント全体」の共有では実験を指定しない。この引数は SQL 側が
        // `uuid default null` なので、省略すれば DB 側で null になる。
        p_experiment: args.experimentId ?? undefined,
        p_permission: args.permission,
      });
      if (error) throw error;
      return (data as "shared" | "invited") ?? "invited";
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.myShares });
      qc.invalidateQueries({ queryKey: sqk.profiles });
      // 未登録の相手だった場合は「招待中」に増えるので更新する
      qc.invalidateQueries({ queryKey: sqk.invitations });
    },
  });
}

/** まだ登録されていない相手への招待（未受諾のものだけ） */
export function usePendingInvitations() {
  return useQuery({
    queryKey: sqk.invitations,
    queryFn: async (): Promise<ShareInvitation[]> => {
      const { data, error } = await supabase
        .from("share_invitations")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []).map(toShareInvitation);
    },
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("share_invitations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: sqk.invitations }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_shares")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: sqk.myShares }),
  });
}

/** ログイン直後に呼ぶ。自分のメール宛の招待を実際の共有へ変換する。 */
export function useClaimInvitations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("claim_share_invitations");
      if (error) return 0;
      return (data as number) ?? 0;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: sqk.incomingShares });
      qc.invalidateQueries({ queryKey: sqk.profiles });
    },
  });
}

/**
 * 招待の受諾をマウント時に1回だけ実行する。
 *
 * これを呼ばないと `claim_share_invitations()` が走らず、学生がメールで招待しても
 * `shared_owner_ids()` が空のままになり、共有された相手の一覧が永久に空になる。
 * カレンダーを開かない教授（/teacher に直行する）でも必ず走らせる必要があるため、
 * ref ガードごと切り出して CalendarApp と TeacherDashboard の両方で使う。
 */
export function useClaimInvitationsOnce(enabled: boolean) {
  const claim = useClaimInvitations();
  const ran = useRef(false);
  const { mutate } = claim;
  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    mutate();
  }, [enabled, mutate]);
}

// ---------------- 他人のカレンダー（閲覧専用） ----------------

export function useSharedExperiments(ownerId: string) {
  return useQuery({
    queryKey: sqk.experiments(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", ownerId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(toExperiment);
    },
  });
}

export function useSharedTasks(ownerId: string) {
  return useQuery({
    queryKey: sqk.tasks(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", ownerId)
        .order("start_time");
      if (error) throw error;
      return (data ?? []).map(toTask);
    },
  });
}

// ---------------- 研究室タイムライン（複数人まとめて・閲覧専用） ----------------

/**
 * 研究室のメンバー全員の予定を、表示期間ぶんだけ1回で取る。
 *
 * ■ なぜ1クエリで済むか
 * RLS の tasks_shared_select は `user_id in (select shared_owner_ids())` で、
 * 集合を返す関数は行ごとではなくクエリ全体で1回だけ評価される
 * （supabase/sql/00_baseline.sql の注記）。つまり `.in("user_id", ids)` は
 * 「渡した id のうち自分に見えるもの」に自然に絞られる。人数ぶん往復する必要はない。
 * 索引 idx_tasks_user_start(user_id, start_time) がそのまま効く。
 *
 * ■ 期間は「重なり」で絞る
 * 開始日だけで絞ると、**表示期間より前に始まって期間内に続いている予定**が
 * 消えてしまう。培養のように何日もまたがる工程では普通に起きるので、
 * start < to かつ end > from で判定する。
 */
export function useLabTimelineTasks(
  ownerIds: string[],
  fromMs: number,
  toMs: number,
) {
  return useQuery({
    queryKey: sqk.labTimelineTasks(ownerIds, fromMs, toMs),
    enabled: ownerIds.length > 0 && toMs > fromMs,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("user_id", ownerIds)
        .lt("start_time", new Date(toMs).toISOString())
        .gt("end_time", new Date(fromMs).toISOString())
        .order("start_time");
      if (error) throw error;
      return (data ?? []).map(toTask);
    },
  });
}

/**
 * タイムラインのバーを実験の色で塗るための実験一覧。
 * 色を引くためだけなので期間では絞らない（数が少なく、予定より変化しない）。
 */
export function useLabTimelineExperiments(ownerIds: string[]) {
  return useQuery({
    queryKey: sqk.labTimelineExperiments(ownerIds),
    enabled: ownerIds.length > 0,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .in("user_id", ownerIds);
      if (error) throw error;
      return (data ?? []).map(toExperiment);
    },
  });
}

export function useSharedDeps(ownerId: string) {
  return useQuery({
    queryKey: sqk.deps(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<TaskDependency[]> => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("*")
        .eq("user_id", ownerId);
      if (error) return [];
      return data ?? [];
    },
  });
}

export function useSharedEquipment(ownerId: string) {
  return useQuery({
    queryKey: sqk.equipment(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<Equipment[]> => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", ownerId);
      if (error) return [];
      return data ?? [];
    },
  });
}

// ---------------- コメント ----------------

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: sqk.comments(taskId ?? "none"),
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at");
      if (error) return [];
      return data ?? [];
    },
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { taskId: string; body: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("task_comments").insert({
        task_id: args.taskId,
        author_id: user.id,
        body: args.body,
      });
      if (error) throw error;
    },
    onSettled: (_d, _e, args) =>
      qc.invalidateQueries({ queryKey: sqk.comments(args.taskId) }),
  });
}

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSettled: (_d, _e, args) =>
      qc.invalidateQueries({ queryKey: sqk.comments(args.taskId) }),
  });
}
