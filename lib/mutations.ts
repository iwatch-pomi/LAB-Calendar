"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { expandTemplate } from "@/lib/expandTemplate";
import { WORKING_HOURS, TZ_OFFSET_MINUTES } from "@/lib/config";
import type { Interval } from "@/lib/reschedule";
import type { Equipment, Task, Template, TemplateStep } from "@/lib/types";
import { qk } from "@/lib/queries";

const supabase = createClient();

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

/**
 * テンプレートから実験を一括登録する。
 * template_steps を展開して tasks を作成し、連続ステップ間に依存関係を張る。
 * 装置名は equipment に名寄せ（無ければ作成）。
 */
export function useCreateExperimentFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { templateId: string; startISO: string }) => {
      const userId = await getUserId();
      const startMs = new Date(args.startISO).getTime();

      // テンプレとステップ
      const [{ data: tpl }, { data: steps }, { data: equip }, { data: existing }] =
        await Promise.all([
          supabase
            .from("templates")
            .select("*")
            .eq("id", args.templateId)
            .single(),
          supabase
            .from("template_steps")
            .select("*")
            .eq("template_id", args.templateId)
            .order("step_order"),
          supabase.from("equipment").select("*"),
          supabase.from("tasks").select("*").not("equipment_id", "is", null),
        ]);
      if (!tpl) throw new Error("template not found");
      const template = tpl as Template;
      const templateSteps = (steps ?? []) as TemplateStep[];
      const equipment = (equip ?? []) as Equipment[];
      const existingTasks = (existing ?? []) as Task[];

      // 装置名→id（無ければ作成）
      const equipByName = new Map(equipment.map((e) => [e.name, e]));
      const neededNames = new Set(
        templateSteps
          .map((s) => s.equipment_name)
          .filter((n): n is string => !!n),
      );
      for (const name of neededNames) {
        if (!equipByName.has(name)) {
          const { data: created } = await supabase
            .from("equipment")
            .insert({ user_id: userId, name, color: "slate" })
            .select()
            .single();
          if (created) equipByName.set(name, created as Equipment);
        }
      }

      // 既存の装置占有区間（name をキーにして競合回避）
      const idToName = new Map(equipment.map((e) => [e.id, e.name]));
      const equipmentBusy: Interval[] = existingTasks
        .filter((t) => t.equipment_id && idToName.has(t.equipment_id))
        .map((t) => ({
          start: new Date(t.start_time).getTime(),
          end: new Date(t.end_time).getTime(),
          equipmentId: idToName.get(t.equipment_id!)!, // name をキーに
        }));

      const { tasks: planned, deps } = expandTemplate(
        templateSteps,
        startMs,
        { workingHours: WORKING_HOURS, tzOffsetMinutes: TZ_OFFSET_MINUTES },
        equipmentBusy,
      );

      // 実験を作成
      const { data: exp, error: expErr } = await supabase
        .from("experiments")
        .insert({
          user_id: userId,
          template_id: template.id,
          name: template.name,
          status: "in_progress",
          current_step: 1,
          total_steps: template.total_steps,
          color: template.color,
        })
        .select()
        .single();
      if (expErr || !exp) throw expErr ?? new Error("experiment insert failed");

      // タスクを作成
      const taskRows = planned.map((p) => ({
        user_id: userId,
        experiment_id: exp.id,
        title: p.title,
        subtitle: p.subtitle,
        start_time: new Date(p.startMs).toISOString(),
        end_time: new Date(p.endMs).toISOString(),
        status: "planned" as const,
        equipment_id: p.equipmentName
          ? (equipByName.get(p.equipmentName)?.id ?? null)
          : null,
        needs_reservation: p.needsReservation,
        is_wait: p.isWait,
        template_step_id: p.stepId,
      }));
      const { data: insertedTasks, error: tErr } = await supabase
        .from("tasks")
        .insert(taskRows)
        .select();
      if (tErr || !insertedTasks) throw tErr ?? new Error("tasks insert failed");

      // tempId → 実 id の対応（挿入順は保持される）
      const tempToId = new Map<string, string>();
      planned.forEach((p, i) => tempToId.set(p.tempId, insertedTasks[i].id));

      // 依存関係を作成
      if (deps.length) {
        const depRows = deps.map((d) => ({
          user_id: userId,
          predecessor_id: tempToId.get(d.predTemp)!,
          successor_id: tempToId.get(d.succTemp)!,
          gap_minutes: d.gapMinutes,
        }));
        const { error: dErr } = await supabase
          .from("task_dependencies")
          .insert(depRows);
        if (dErr) throw dErr;
      }

      return exp.id as string;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.deps });
      qc.invalidateQueries({ queryKey: qk.experiments });
      qc.invalidateQueries({ queryKey: qk.equipment });
    },
  });
}

/**
 * テンプレートのステップを「連続で」配置する（並び替え前提の簡易版）。
 * offset/wait/装置の空き判定は行わず、クリック位置から各ステップの所要時間ぶんだけ
 * 隙間なく順番に並べる。後でドラッグして自由に並び替えることを前提とした登録。
 */
export function usePlaceTemplateAt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { templateId: string; startISO: string }) => {
      const userId = await getUserId();
      const startMs = new Date(args.startISO).getTime();

      const [{ data: tpl }, { data: steps }, { data: equip }] =
        await Promise.all([
          supabase
            .from("templates")
            .select("*")
            .eq("id", args.templateId)
            .single(),
          supabase
            .from("template_steps")
            .select("*")
            .eq("template_id", args.templateId)
            .order("step_order"),
          supabase.from("equipment").select("*"),
        ]);
      if (!tpl) throw new Error("template not found");
      const template = tpl as Template;
      const templateSteps = ((steps ?? []) as TemplateStep[]).slice().sort(
        (a, b) => a.step_order - b.step_order,
      );
      const equipment = (equip ?? []) as Equipment[];

      // 装置名→id（無ければ作成）
      const equipByName = new Map(equipment.map((e) => [e.name, e]));
      const neededNames = new Set(
        templateSteps
          .map((s) => s.equipment_name)
          .filter((n): n is string => !!n),
      );
      for (const name of neededNames) {
        if (!equipByName.has(name)) {
          const { data: created } = await supabase
            .from("equipment")
            .insert({ user_id: userId, name, color: "slate" })
            .select()
            .single();
          if (created) equipByName.set(name, created as Equipment);
        }
      }

      // 実験を作成
      const { data: exp, error: expErr } = await supabase
        .from("experiments")
        .insert({
          user_id: userId,
          template_id: template.id,
          name: template.name,
          status: "in_progress",
          current_step: 1,
          total_steps: template.total_steps,
          color: template.color,
        })
        .select()
        .single();
      if (expErr || !exp) throw expErr ?? new Error("experiment insert failed");

      // ステップを隙間なく連続で並べる
      let cursor = startMs;
      const taskRows = templateSteps.map((s) => {
        const start = cursor;
        const end = start + s.duration_minutes * 60000;
        cursor = end;
        return {
          user_id: userId,
          experiment_id: exp.id,
          title: s.title,
          subtitle: s.subtitle,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          status: "planned" as const,
          equipment_id: s.equipment_name
            ? (equipByName.get(s.equipment_name)?.id ?? null)
            : null,
          needs_reservation: s.needs_reservation,
          is_wait: /待機|培養待|インキュベート|静置|反応待/.test(s.title),
          template_step_id: s.id,
        };
      });

      const { error: tErr } = await supabase.from("tasks").insert(taskRows);
      if (tErr) throw tErr;

      return exp.id as string;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.experiments });
      qc.invalidateQueries({ queryKey: qk.equipment });
    },
  });
}

/**
 * 自動リスケの確定: 計算済みの移動(moves)を一括で永続化し、
 * 失敗タスクをやり直し(planned)へ戻す。
 */
export function useCommitReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      failedId: string;
      moves: { id: string; start: number; end: number }[];
    }) => {
      // 失敗タスクはやり直しとして planned に戻す
      for (const mv of args.moves) {
        const patch: Partial<Task> = {
          start_time: new Date(mv.start).toISOString(),
          end_time: new Date(mv.end).toISOString(),
        };
        if (mv.id === args.failedId) patch.status = "planned";
        const { error } = await supabase
          .from("tasks")
          .update(patch)
          .eq("id", mv.id);
        if (error) throw error;
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.experiments });
    },
  });
}

/** 空の実験を作成（テンプレ無し） */
export function useCreateEmptyExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { name: string; color: string }) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("experiments")
        .insert({
          user_id: userId,
          name: args.name,
          status: "planning",
          color: args.color,
          total_steps: 0,
          current_step: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.experiments }),
  });
}
