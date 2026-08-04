"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "@/lib/queries";
import { useGuest } from "./GuestProvider";
import { PALETTE_KEYS, paletteFor, type Template } from "@/lib/types";
import { X, Plus, Trash2 } from "lucide-react";

interface StepDraft {
  title: string;
  duration_minutes: number;
  wait_after_minutes: number;
  equipment_name: string;
}

const emptyStep = (): StepDraft => ({
  title: "",
  duration_minutes: 60,
  wait_after_minutes: 0,
  equipment_name: "",
});

export function TemplateBuilder({
  template,
  onClose,
}: {
  template?: Template;
  onClose: () => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const { isGuest, requireLogin } = useGuest();
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [estimatedLabel, setEstimatedLabel] = useState(
    template?.estimated_label ?? "",
  );
  const [color, setColor] = useState(template?.color ?? "teal");
  const [steps, setSteps] = useState<StepDraft[]>(
    isEdit ? [] : [emptyStep()],
  );
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集時: 既存ステップを読み込む
  useEffect(() => {
    if (!template) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("template_steps")
        .select("*")
        .eq("template_id", template.id)
        .order("step_order");
      if (!active) return;
      const drafts: StepDraft[] = (data ?? []).map((s) => ({
        title: s.title,
        duration_minutes: s.duration_minutes,
        wait_after_minutes: s.wait_after_minutes,
        equipment_name: s.equipment_name ?? "",
      }));
      setSteps(drafts.length ? drafts : [emptyStep()]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  function updateStep(i: number, patch: Partial<StepDraft>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }

  async function save() {
    setError(null);
    // ゲストはテンプレートを保存できない（ログイン案内を出して閉じる）
    if (isGuest) {
      requireLogin();
      onClose();
      return;
    }
    const validSteps = steps.filter((s) => s.title.trim());
    if (!name.trim() || validSteps.length === 0) {
      setError("テンプレート名と少なくとも1つのステップが必要です。");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const fields = {
        name: name.trim(),
        description: `全${validSteps.length}ステップ${
          estimatedLabel ? `・${estimatedLabel}` : ""
        }`,
        estimated_label: estimatedLabel || null,
        total_steps: validSteps.length,
        color,
      };

      let templateId: string;
      if (isEdit && template) {
        const { error: uErr } = await supabase
          .from("templates")
          .update(fields)
          .eq("id", template.id);
        if (uErr) throw uErr;
        templateId = template.id;
        // ステップは差し替え（全削除→再挿入）
        const { error: dErr } = await supabase
          .from("template_steps")
          .delete()
          .eq("template_id", templateId);
        if (dErr) throw dErr;
      } else {
        const { data: tpl, error: tErr } = await supabase
          .from("templates")
          .insert({ user_id: user.id, ...fields })
          .select()
          .single();
        if (tErr || !tpl) throw tErr ?? new Error("insert failed");
        templateId = tpl.id;
      }

      const stepRows = validSteps.map((s, i) => ({
        template_id: templateId,
        step_order: i + 1,
        title: s.title.trim(),
        duration_minutes: s.duration_minutes,
        wait_after_minutes: s.wait_after_minutes,
        equipment_name: s.equipment_name.trim() || null,
        needs_reservation: !!s.equipment_name.trim(),
      }));
      const { error: sErr } = await supabase
        .from("template_steps")
        .insert(stepRows);
      if (sErr) throw sErr;

      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.templateSteps });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!template) return;
    if (
      !confirm(
        `テンプレート「${template.name}」を削除しますか？\n（登録済みの実験・予定は残ります）`,
      )
    )
      return;
    setDeleting(true);
    try {
      const { error: dErr } = await supabase
        .from("templates")
        .delete()
        .eq("id", template.id);
      if (dErr) throw dErr;
      qc.invalidateQueries({ queryKey: qk.templates });
      qc.invalidateQueries({ queryKey: qk.templateSteps });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {isEdit ? "テンプレを編集" : "テンプレを作成"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="thin-scroll flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                テンプレート名
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Western Blotting"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                目安期間
              </label>
              <input
                value={estimatedLabel}
                onChange={(e) => setEstimatedLabel(e.target.value)}
                placeholder="例: 約2日"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                カラー
              </label>
              <div className="flex gap-1.5 pt-1.5">
                {PALETTE_KEYS.map((k) => {
                  const p = paletteFor(k);
                  return (
                    <button
                      key={k}
                      onClick={() => setColor(k)}
                      className={`h-6 w-6 rounded-full ${p.dot} ${
                        color === k
                          ? "ring-2 ring-gray-400 ring-offset-1"
                          : ""
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-gray-500">
              ステップ
            </div>
            {loading && (
              <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                読み込み中…
              </p>
            )}
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {i + 1}
                    </span>
                    <input
                      value={s.title}
                      onChange={(e) => updateStep(i, { title: e.target.value })}
                      placeholder="ステップ名"
                      className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    {steps.length > 1 && (
                      <button
                        onClick={() =>
                          setSteps((st) => st.filter((_, idx) => idx !== i))
                        }
                        className="text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      所要(分)
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={s.duration_minutes}
                        onChange={(e) =>
                          updateStep(i, {
                            duration_minutes: Number(e.target.value),
                          })
                        }
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </label>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      待ち(分)
                      <input
                        type="number"
                        min={0}
                        step={15}
                        value={s.wait_after_minutes}
                        onChange={(e) =>
                          updateStep(i, {
                            wait_after_minutes: Number(e.target.value),
                          })
                        }
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </label>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      装置
                      <input
                        value={s.equipment_name}
                        onChange={(e) =>
                          updateStep(i, { equipment_name: e.target.value })
                        }
                        placeholder="任意"
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSteps((s) => [...s, emptyStep()])}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <Plus className="h-4 w-4" />
              ステップを追加
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          {isEdit && (
            <button
              onClick={remove}
              disabled={deleting || saving}
              className="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "削除中…" : "削除"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving || deleting}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "保存中…" : isEdit ? "変更を保存" : "テンプレを保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
