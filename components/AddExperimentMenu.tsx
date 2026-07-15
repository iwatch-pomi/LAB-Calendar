"use client";

import { useState } from "react";
import { useCreateExperimentFromTemplate } from "@/lib/mutations";
import { useCreateTask } from "@/lib/queries";
import { paletteFor, type Template } from "@/lib/types";
import { nowMs, weekStartMs } from "@/lib/calendar";
import { FileText, CalendarPlus, Wand2 } from "lucide-react";

/** now を 30分単位に切り上げ */
function nextSlotISO(): string {
  const now = nowMs();
  const rounded = Math.ceil(now / (30 * 60000)) * 30 * 60000;
  return new Date(rounded).toISOString();
}

export function AddExperimentMenu({
  templates,
  refMs,
  onClose,
  onCreateTemplate,
}: {
  templates: Template[];
  refMs: number;
  onClose: () => void;
  onCreateTemplate: () => void;
}) {
  const createFromTemplate = useCreateExperimentFromTemplate();
  const createTask = useCreateTask();
  const [busy, setBusy] = useState<string | null>(null);

  async function pickTemplate(t: Template) {
    setBusy(t.id);
    try {
      await createFromTemplate.mutateAsync({
        templateId: t.id,
        startISO: nextSlotISO(),
      });
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function createEmpty() {
    setBusy("empty");
    try {
      // 表示中の週の月曜10:00に1時間の空き予定
      const start = weekStartMs(refMs) + 10 * 3600000;
      await createTask.mutateAsync({
        title: "新しい予定",
        start_time: new Date(start).toISOString(),
        end_time: new Date(start + 3600000).toISOString(),
      });
      onClose();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* 背景クリックで閉じる */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
        <div className="px-1 pb-2">
          <div className="text-sm font-bold text-gray-800">実験を追加</div>
          <div className="text-xs text-gray-500">
            テンプレートから一連のステップをまとめて登録
          </div>
        </div>

        <div className="space-y-1.5">
          {templates.map((t) => {
            const p = paletteFor(t.color);
            return (
              <button
                key={t.id}
                disabled={busy !== null}
                onClick={() => pickTemplate(t)}
                className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition hover:border-gray-300 ${
                  busy === t.id
                    ? "border-brand-300 bg-brand-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${p.soft}`}
                >
                  <FileText className={`h-4 w-4 ${p.text}`} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-800">
                    {t.name}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-1.5 border-t border-gray-100 pt-2">
          <button
            disabled={busy !== null}
            onClick={createEmpty}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            <CalendarPlus className="h-4 w-4" />
            空の予定
          </button>
          <button
            onClick={onCreateTemplate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            <Wand2 className="h-4 w-4" />
            テンプレを作成
          </button>
        </div>
      </div>
    </>
  );
}
