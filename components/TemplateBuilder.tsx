"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "@/lib/queries";
import { PALETTE_KEYS, paletteFor } from "@/lib/types";
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

export function TemplateBuilder({ onClose }: { onClose: () => void }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [estimatedLabel, setEstimatedLabel] = useState("");
  const [color, setColor] = useState("teal");
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(i: number, patch: Partial<StepDraft>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }

  async function save() {
    setError(null);
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

      const { data: tpl, error: tErr } = await supabase
        .from("templates")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: `全${validSteps.length}ステップ${
            estimatedLabel ? `・${estimatedLabel}` : ""
          }`,
          estimated_label: estimatedLabel || null,
          total_steps: validSteps.length,
          color,
        })
        .select()
        .single();
      if (tErr || !tpl) throw tErr ?? new Error("insert failed");

      const stepRows = validSteps.map((s, i) => ({
        template_id: tpl.id,
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

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-base font-bold text-gray-800">テンプレを作成</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="thin-scroll flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                テンプレート名
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Western Blotting"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                目安期間
              </label>
              <input
                value={estimatedLabel}
                onChange={(e) => setEstimatedLabel(e.target.value)}
                placeholder="例: 約2日"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
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
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                      {i + 1}
                    </span>
                    <input
                      value={s.title}
                      onChange={(e) => updateStep(i, { title: e.target.value })}
                      placeholder="ステップ名"
                      className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
                    />
                    {steps.length > 1 && (
                      <button
                        onClick={() =>
                          setSteps((st) => st.filter((_, idx) => idx !== i))
                        }
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs text-gray-500">
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
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
                      />
                    </label>
                    <label className="text-xs text-gray-500">
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
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
                      />
                    </label>
                    <label className="text-xs text-gray-500">
                      装置
                      <input
                        value={s.equipment_name}
                        onChange={(e) =>
                          updateStep(i, { equipment_name: e.target.value })
                        }
                        placeholder="任意"
                        className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSteps((s) => [...s, emptyStep()])}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600"
            >
              <Plus className="h-4 w-4" />
              ステップを追加
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "保存中…" : "テンプレを保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
