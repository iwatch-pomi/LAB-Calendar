"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useGuest } from "@/components/GuestProvider";
import { guestStore } from "@/lib/guestStore";
import type {
  CultureMedium,
  Equipment,
  Experiment,
  FeatureFlags,
  FeedbackCategory,
  Task,
  TaskDependency,
  Template,
  TemplateStep,
  Todo,
  UserProfile,
  UserRole,
} from "@/lib/types";

const supabase = createClient();

export const qk = {
  equipment: ["equipment"] as const,
  templates: ["templates"] as const,
  templateSteps: ["template_steps"] as const,
  experiments: ["experiments"] as const,
  tasks: ["tasks"] as const,
  deps: ["deps"] as const,
  todos: ["todos"] as const,
  settings: ["settings"] as const,
  role: ["role"] as const,
  cultureMedia: ["culture_media"] as const,
  profile: ["profile"] as const,
  feedback: ["feedback"] as const,
};

/**
 * ゲストとログイン後でキャッシュを分けるためのキー。
 *
 * 読み取りは `[...qk.tasks, "guest"|"user"]` を使うのに、ミューテーションの
 * onMutate 側は `qk.tasks`（サフィックス無し）を読み書きしていたため、
 * 楽観的更新が誰も見ていないキャッシュに書かれて効いていなかった。
 * invalidateQueries は前方一致なので気付きにくいが、getQueryData /
 * setQueryData / cancelQueries は完全一致なので必ずこれを通す。
 */
export function scoped<T extends readonly string[]>(
  base: T,
  isGuest: boolean,
): readonly [...T, string] {
  return [...base, isGuest ? "guest" : "user"] as const;
}

/**
 * 自分の行だけを取るための user_id。
 *
 * 共有機能で experiments / tasks / task_dependencies / todos / equipment の
 * SELECT が「共有された他人の行」まで広がったため、メイン画面の読み取りは
 * RLS 任せにできない。RLS は「見せてよい範囲」、こちらは「この画面で見たい
 * 範囲」で別物なので明示的に絞る。
 * getSession() はローカルのクッキー読みなので毎クエリ呼んでも安い。
 */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ---------------- Queries ----------------
// ゲスト（未ログイン）ではサーバーを見ず guestStore（localStorage）から返す。
// 匿名のSELECTはRLSで「0件の成功」になり空表示になってしまうため。
// queryKey に "guest" を足してログイン後のキャッシュと混ざらないようにする
// （invalidateQueries は前方一致なので既存の qk.* 指定はそのまま効く）。

export function useEquipment() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.equipment, isGuest),
    queryFn: async (): Promise<Equipment[]> => {
      if (isGuest) return guestStore.equipment();
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", uid)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTemplates() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.templates, isGuest),
    queryFn: async (): Promise<Template[]> => {
      if (isGuest) return guestStore.templates();
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTemplateSteps() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.templateSteps, isGuest),
    queryFn: async (): Promise<TemplateStep[]> => {
      if (isGuest) return guestStore.templateSteps();
      const { data, error } = await supabase
        .from("template_steps")
        .select("*")
        .order("step_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExperiments() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.experiments, isGuest),
    queryFn: async (): Promise<Experiment[]> => {
      if (isGuest) return guestStore.experiments();
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", uid)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTasks() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.tasks, isGuest),
    queryFn: async (): Promise<Task[]> => {
      if (isGuest) return guestStore.tasks();
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", uid)
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDependencies() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.deps, isGuest),
    queryFn: async (): Promise<TaskDependency[]> => {
      if (isGuest) return guestStore.deps();
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("*")
        .eq("user_id", uid);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodos() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.todos, isGuest),
    queryFn: async (): Promise<Todo[]> => {
      if (isGuest) return guestStore.todos();
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", uid)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) return requireLogin();
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      if (isGuest) return {};
      await qc.cancelQueries({ queryKey: scoped(qk.templates, isGuest) });
      const prev = qc.getQueryData<Template[]>(scoped(qk.templates, isGuest));
      qc.setQueryData<Template[]>(scoped(qk.templates, isGuest), (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.templates, isGuest), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.templateSteps });
    },
  });
}

export function useSettings() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.settings, isGuest),
    queryFn: async (): Promise<FeatureFlags> => {
      // ゲストは設定を保存できないので既定値。onboarded を立てて
      // オンボーディング（保存にログインが要り、閉じられない）を抑止する。
      if (isGuest) return { onboarded: true };
      const { data, error } = await supabase
        .from("user_settings")
        .select("features")
        .maybeSingle();
      // テーブル未作成でもクラッシュさせず既定（全機能オフ）を返す
      if (error) return {};
      return ((data?.features as FeatureFlags) ?? {}) as FeatureFlags;
    },
  });
}

/**
 * 利用形態（学生 / 教授）。features(jsonb) とは別の専用カラムから読む。
 *
 * ログイン後の行き先を決める土台なので、他の設定の保存に巻き込まれないよう
 * 完全に分けて扱う。ゲストはアカウントを持たないので常に学生。
 */
export function useUserRole() {
  const { isGuest } = useGuest();
  return useQuery({
    queryKey: scoped(qk.role, isGuest),
    queryFn: async (): Promise<UserRole> => {
      if (isGuest) return "student";
      const { data, error } = await supabase
        .from("user_settings")
        .select("role")
        .maybeSingle();
      // 行が無い/読めない場合は学生として扱う。誤判定の向きを
      // 「カレンダーが見える（無害）」側に倒し、締め出しを起こさない。
      if (error) return "student";
      return data?.role === "teacher" ? "teacher" : "student";
    },
  });
}

/** 利用形態を保存する。role カラムだけを触るので他の設定は巻き込まない。 */
export function useUpdateRole() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (role: UserRole) => {
      if (isGuest) {
        requireLogin();
        throw new Error("not authenticated");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        role,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (role) => {
      await qc.cancelQueries({ queryKey: scoped(qk.role, isGuest) });
      const prev = qc.getQueryData<UserRole>(scoped(qk.role, isGuest));
      qc.setQueryData<UserRole>(scoped(qk.role, isGuest), role);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.role, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.role }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async (): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("display_name, avatar_emoji, avatar_color")
        .maybeSingle();
      // カラム未追加でもクラッシュさせず既定を返す
      if (error) return { display_name: null, avatar_emoji: null, avatar_color: null };
      return {
        display_name: data?.display_name ?? null,
        avatar_emoji: data?.avatar_emoji ?? null,
        avatar_color: data?.avatar_color ?? null,
      };
    },
  });
}

export function useCultureMedia() {
  return useQuery({
    queryKey: qk.cultureMedia,
    queryFn: async (): Promise<CultureMedium[]> => {
      const { data, error } = await supabase
        .from("culture_media")
        .select("*")
        .order("created_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return []; // テーブル未作成でも空で返す
      return data ?? [];
    },
  });
}

// ---------------- Mutations ----------------

export function useMoveTask() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      start_time: string;
      end_time: string;
    }) => {
      if (isGuest) {
        guestStore.updateTask(args.id, {
          start_time: args.start_time,
          end_time: args.end_time,
        });
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase
        .from("tasks")
        .update({ start_time: args.start_time, end_time: args.end_time })
        .eq("id", args.id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: scoped(qk.tasks, isGuest) });
      const prev = qc.getQueryData<Task[]>(scoped(qk.tasks, isGuest));
      qc.setQueryData<Task[]>(scoped(qk.tasks, isGuest), (old) =>
        (old ?? []).map((t) =>
          t.id === args.id
            ? { ...t, start_time: args.start_time, end_time: args.end_time }
            : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.tasks, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: { id: string } & Partial<Task>) => {
      const { id, ...patch } = args;
      if (isGuest) {
        guestStore.updateTask(id, patch);
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: scoped(qk.tasks, isGuest) });
      const prev = qc.getQueryData<Task[]>(scoped(qk.tasks, isGuest));
      const { id, ...patch } = args;
      qc.setQueryData<Task[]>(scoped(qk.tasks, isGuest), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.tasks, isGuest), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.experiments });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        guestStore.deleteTask(id);
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.deps });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      start_time: string;
      end_time: string;
      experiment_id?: string | null;
      subtitle?: string | null;
      equipment_id?: string | null;
      is_wait?: boolean;
    }) => {
      if (isGuest) {
        const t = guestStore.createTask(args);
        notifyGuestEdit();
        return t;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: args.title,
          start_time: args.start_time,
          end_time: args.end_time,
          experiment_id: args.experiment_id ?? null,
          subtitle: args.subtitle ?? null,
          equipment_id: args.equipment_id ?? null,
          needs_reservation: !!args.equipment_id,
          is_wait: args.is_wait ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: { id: string; done: boolean }) => {
      const completed_at = args.done ? new Date().toISOString() : null;
      if (isGuest) {
        guestStore.updateTodo(args.id, { done: args.done, completed_at });
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase
        .from("todos")
        .update({ done: args.done, completed_at })
        .eq("id", args.id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: scoped(qk.todos, isGuest) });
      const prev = qc.getQueryData<Todo[]>(scoped(qk.todos, isGuest));
      const completed_at = args.done ? new Date().toISOString() : null;
      qc.setQueryData<Todo[]>(scoped(qk.todos, isGuest), (old) =>
        (old ?? []).map((t) =>
          t.id === args.id ? { ...t, done: args.done, completed_at } : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.todos, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useAddEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { name: string; color?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("equipment").insert({
        user_id: user.id,
        name: args.name,
        color: args.color ?? "slate",
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.equipment }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  const { isGuest } = useGuest();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: scoped(qk.equipment, isGuest) });
      const prev = qc.getQueryData<Equipment[]>(scoped(qk.equipment, isGuest));
      qc.setQueryData<Equipment[]>(scoped(qk.equipment, isGuest), (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.equipment, isGuest), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.equipment });
      qc.invalidateQueries({ queryKey: qk.tasks }); // 参照タスクの装置がnullになるため
    },
  });
}

export function useAddTodo() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      sort_order: number;
      due_at?: string | null;
    }) => {
      if (isGuest) {
        guestStore.createTodo(args);
        notifyGuestEdit();
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("todos").insert({
        user_id: user.id,
        title: args.title,
        sort_order: args.sort_order,
        due_at: args.due_at ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

/** お問い合わせ / フィードバックを送信（開発者への連絡）。 */
export function useAddFeedback() {
  return useMutation({
    mutationFn: async (args: {
      category: FeedbackCategory;
      body: string;
      email?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        email: args.email ?? user.email ?? null,
        category: args.category,
        body: args.body,
      });
      if (error) throw error;
    },
  });
}

export function useUpdateExperiment() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (args: { id: string } & Partial<Experiment>) => {
      if (isGuest) return requireLogin();
      const { id, ...patch } = args;
      const { error } = await supabase
        .from("experiments")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      if (isGuest) return {};
      await qc.cancelQueries({ queryKey: scoped(qk.experiments, isGuest) });
      const prev = qc.getQueryData<Experiment[]>(scoped(qk.experiments, isGuest));
      const { id, ...patch } = args;
      qc.setQueryData<Experiment[]>(scoped(qk.experiments, isGuest), (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.experiments, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.experiments }),
  });
}

export function useDeleteExperiment() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) return requireLogin();
      const { error } = await supabase
        .from("experiments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      if (isGuest) return {};
      await qc.cancelQueries({ queryKey: scoped(qk.experiments, isGuest) });
      const prev = qc.getQueryData<Experiment[]>(scoped(qk.experiments, isGuest));
      qc.setQueryData<Experiment[]>(scoped(qk.experiments, isGuest), (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.experiments, isGuest), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.experiments });
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.deps });
      qc.invalidateQueries({ queryKey: qk.cultureMedia });
    },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      title?: string;
      due_at?: string | null;
    }) => {
      const { id, ...patch } = args;
      if (isGuest) {
        guestStore.updateTodo(id, patch);
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase
        .from("todos")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: scoped(qk.todos, isGuest) });
      const prev = qc.getQueryData<Todo[]>(scoped(qk.todos, isGuest));
      const { id, ...patch } = args;
      qc.setQueryData<Todo[]>(scoped(qk.todos, isGuest), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.todos, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  const { isGuest, notifyGuestEdit } = useGuest();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        guestStore.deleteTodo(id);
        notifyGuestEdit();
        return;
      }
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: scoped(qk.todos, isGuest) });
      const prev = qc.getQueryData<Todo[]>(scoped(qk.todos, isGuest));
      qc.setQueryData<Todo[]>(scoped(qk.todos, isGuest), (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.todos, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserProfile>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...patch,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.profile });
      const prev = qc.getQueryData<UserProfile>(qk.profile);
      qc.setQueryData<UserProfile>(qk.profile, (old) => ({
        display_name: null,
        avatar_emoji: null,
        avatar_color: null,
        ...(old ?? {}),
        ...patch,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.profile, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export function useUpdateFeature() {
  const qc = useQueryClient();
  const { isGuest } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      key: keyof FeatureFlags;
      value: boolean | number | string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const current = qc.getQueryData<FeatureFlags>(scoped(qk.settings, isGuest)) ?? {};
      const features = { ...current, [args.key]: args.value };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        features,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: scoped(qk.settings, isGuest) });
      const prev = qc.getQueryData<FeatureFlags>(scoped(qk.settings, isGuest));
      qc.setQueryData<FeatureFlags>(scoped(qk.settings, isGuest), (old) => ({
        ...(old ?? {}),
        [args.key]: args.value,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.settings, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

/** 複数のフラグを一括更新（オンボーディング等） */
export function useUpdateFeatures() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (partial: FeatureFlags) => {
      if (isGuest) return requireLogin();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const current = qc.getQueryData<FeatureFlags>(scoped(qk.settings, isGuest)) ?? {};
      const features = { ...current, ...partial };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        features,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (partial) => {
      await qc.cancelQueries({ queryKey: scoped(qk.settings, isGuest) });
      const prev = qc.getQueryData<FeatureFlags>(scoped(qk.settings, isGuest));
      qc.setQueryData<FeatureFlags>(scoped(qk.settings, isGuest), (old) => ({
        ...(old ?? {}),
        ...partial,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(scoped(qk.settings, isGuest), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

/** 新規登録直後、デモデータを使う選択をしたときだけ呼ぶ（RPC は初回のみ有効） */
export function useSeedDemoData() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async () => {
      if (isGuest) return requireLogin();
      const { error } = await supabase.rpc("seed_demo_data");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.equipment });
      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.templateSteps });
      qc.invalidateQueries({ queryKey: qk.experiments });
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.deps });
      qc.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useAddCultureMedium() {
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      created_date: string;
      expiry_date?: string | null;
      parent_id?: string | null;
      source_task_id?: string | null;
      note?: string | null;
    }): Promise<CultureMedium | null> => {
      if (isGuest) {
        requireLogin();
        return null;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("culture_media")
        .insert({
          user_id: user.id,
          name: args.name,
          created_date: args.created_date,
          expiry_date: args.expiry_date ?? null,
          parent_id: args.parent_id ?? null,
          source_task_id: args.source_task_id ?? null,
          note: args.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return (data as CultureMedium) ?? null;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cultureMedia }),
  });
}

export function useUpdateCultureMedium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string } & Partial<CultureMedium>) => {
      const { id, ...patch } = args;
      const { error } = await supabase
        .from("culture_media")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.cultureMedia });
      const prev = qc.getQueryData<CultureMedium[]>(qk.cultureMedia);
      const { id, ...patch } = args;
      qc.setQueryData<CultureMedium[]>(qk.cultureMedia, (old) =>
        (old ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cultureMedia, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cultureMedia }),
  });
}

export function useDeleteCultureMedium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("culture_media")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.cultureMedia });
      const prev = qc.getQueryData<CultureMedium[]>(qk.cultureMedia);
      qc.setQueryData<CultureMedium[]>(qk.cultureMedia, (old) =>
        (old ?? []).filter((m) => m.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cultureMedia, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cultureMedia }),
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      predecessor_id: string;
      successor_id: string;
      gap_minutes?: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("task_dependencies").insert({
        user_id: user.id,
        predecessor_id: args.predecessor_id,
        successor_id: args.successor_id,
        gap_minutes: args.gap_minutes ?? 0,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.deps }),
  });
}

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_dependencies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.deps }),
  });
}

/** サーバーアクションの結果を受けて全キャッシュを更新するユーティリティ */
export function useRefreshAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.tasks });
    qc.invalidateQueries({ queryKey: qk.deps });
    qc.invalidateQueries({ queryKey: qk.experiments });
    qc.invalidateQueries({ queryKey: qk.todos });
  };
}
