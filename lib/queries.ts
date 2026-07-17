"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  CultureLink,
  Equipment,
  Experiment,
  FeatureFlags,
  Task,
  TaskDependency,
  Template,
  TemplateStep,
  Todo,
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
  cultureLinks: ["culture_links"] as const,
};

// ---------------- Queries ----------------

export function useEquipment() {
  return useQuery({
    queryKey: qk.equipment,
    queryFn: async (): Promise<Equipment[]> => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: async (): Promise<Template[]> => {
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
  return useQuery({
    queryKey: qk.templateSteps,
    queryFn: async (): Promise<TemplateStep[]> => {
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
  return useQuery({
    queryKey: qk.experiments,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDependencies() {
  return useQuery({
    queryKey: qk.deps,
    queryFn: async (): Promise<TaskDependency[]> => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodos() {
  return useQuery({
    queryKey: qk.todos,
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: async (): Promise<FeatureFlags> => {
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

export function useCultureLinks() {
  return useQuery({
    queryKey: qk.cultureLinks,
    queryFn: async (): Promise<CultureLink[]> => {
      const { data, error } = await supabase
        .from("culture_links")
        .select("*")
        .order("created_at");
      if (error) return []; // テーブル未作成でも空で返す
      return data ?? [];
    },
  });
}

// ---------------- Mutations ----------------

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      start_time: string;
      end_time: string;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ start_time: args.start_time, end_time: args.end_time })
        .eq("id", args.id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = qc.getQueryData<Task[]>(qk.tasks);
      qc.setQueryData<Task[]>(qk.tasks, (old) =>
        (old ?? []).map((t) =>
          t.id === args.id
            ? { ...t, start_time: args.start_time, end_time: args.end_time }
            : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string } & Partial<Task>) => {
      const { id, ...patch } = args;
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = qc.getQueryData<Task[]>(qk.tasks);
      const { id, ...patch } = args;
      qc.setQueryData<Task[]>(qk.tasks, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.experiments });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
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
  return useMutation({
    mutationFn: async (args: { id: string; done: boolean }) => {
      const completed_at = args.done ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("todos")
        .update({ done: args.done, completed_at })
        .eq("id", args.id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.todos });
      const prev = qc.getQueryData<Todo[]>(qk.todos);
      const completed_at = args.done ? new Date().toISOString() : null;
      qc.setQueryData<Todo[]>(qk.todos, (old) =>
        (old ?? []).map((t) =>
          t.id === args.id ? { ...t, done: args.done, completed_at } : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.todos, ctx.prev);
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
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.equipment });
      const prev = qc.getQueryData<Equipment[]>(qk.equipment);
      qc.setQueryData<Equipment[]>(qk.equipment, (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.equipment, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.equipment });
      qc.invalidateQueries({ queryKey: qk.tasks }); // 参照タスクの装置がnullになるため
    },
  });
}

export function useAddTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      sort_order: number;
      due_at?: string | null;
    }) => {
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

export function useUpdateExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string } & Partial<Experiment>) => {
      const { id, ...patch } = args;
      const { error } = await supabase
        .from("experiments")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.experiments });
      const prev = qc.getQueryData<Experiment[]>(qk.experiments);
      const { id, ...patch } = args;
      qc.setQueryData<Experiment[]>(qk.experiments, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.experiments, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.experiments }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      title?: string;
      due_at?: string | null;
    }) => {
      const { id, ...patch } = args;
      const { error } = await supabase
        .from("todos")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.todos });
      const prev = qc.getQueryData<Todo[]>(qk.todos);
      const { id, ...patch } = args;
      qc.setQueryData<Todo[]>(qk.todos, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.todos, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.todos });
      const prev = qc.getQueryData<Todo[]>(qk.todos);
      qc.setQueryData<Todo[]>(qk.todos, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.todos, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useUpdateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { key: keyof FeatureFlags; value: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const current = qc.getQueryData<FeatureFlags>(qk.settings) ?? {};
      const features = { ...current, [args.key]: args.value };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        features,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: qk.settings });
      const prev = qc.getQueryData<FeatureFlags>(qk.settings);
      qc.setQueryData<FeatureFlags>(qk.settings, (old) => ({
        ...(old ?? {}),
        [args.key]: args.value,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.settings, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

/** 複数のフラグを一括更新（オンボーディング等） */
export function useUpdateFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partial: FeatureFlags) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const current = qc.getQueryData<FeatureFlags>(qk.settings) ?? {};
      const features = { ...current, ...partial };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        features,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onMutate: async (partial) => {
      await qc.cancelQueries({ queryKey: qk.settings });
      const prev = qc.getQueryData<FeatureFlags>(qk.settings);
      qc.setQueryData<FeatureFlags>(qk.settings, (old) => ({
        ...(old ?? {}),
        ...partial,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.settings, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

export function useAddCultureLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      parent_task_id: string;
      child_task_id: string;
      passage_no?: number | null;
      note?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("culture_links").insert({
        user_id: user.id,
        parent_task_id: args.parent_task_id,
        child_task_id: args.child_task_id,
        passage_no: args.passage_no ?? null,
        note: args.note ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cultureLinks }),
  });
}

export function useDeleteCultureLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("culture_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.cultureLinks });
      const prev = qc.getQueryData<CultureLink[]>(qk.cultureLinks);
      qc.setQueryData<CultureLink[]>(qk.cultureLinks, (old) =>
        (old ?? []).filter((l) => l.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cultureLinks, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.cultureLinks }),
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
