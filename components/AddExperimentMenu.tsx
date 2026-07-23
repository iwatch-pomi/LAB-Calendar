"use client";

import { useState } from "react";
import { useCreateTask, useDeleteTemplate } from "@/lib/queries";
import { paletteFor, type Template } from "@/lib/types";
import { weekStartMs } from "@/lib/calendar";
import { FileText, CalendarPlus, Wand2, Pencil, Trash2 } from "lucide-react";

export function AddExperimentMenu({
  templates,
  refMs,
  weekStartsOn,
  onClose,
  onCreateTemplate,
  onEditTemplate,
  onPlaceTemplate,
}: {
  templates: Template[];
  refMs: number;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  onCreateTemplate: () => void;
  onEditTemplate: (t: Template) => void;
  onPlaceTemplate: (t: Template) => void;
}) {
  const createTask = useCreateTask();
  const deleteTemplate = useDeleteTemplate();
  const [busy, setBusy] = useState<string | null>(null);

  function handleDelete(t: Template) {
    if (
      confirm(
        `テンプレート「${t.name}」を削除しますか？\n（登録済みの実験・予定は残ります）`,
      )
    ) {
      deleteTemplate.mutate(t.id);
    }
  }

  // テンプレを選ぶ → 配置モードに入り、カレンダーのクリック位置に展開
  function pickTemplate(t: Template) {
    onPlaceTemplate(t);
    onClose();
  }

  async function createEmpty() {
    setBusy("empty");
    try {
      // 表示中の週の開始日10:00に1時間の空き予定
      const start = weekStartMs(refMs, weekStartsOn) + 10 * 3600000;
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
              <div
                key={t.id}
                className={`flex items-stretch rounded-xl border transition hover:border-gray-300 ${
                  busy === t.id
                    ? "border-brand-300 bg-brand-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  disabled={busy !== null}
                  onClick={() => pickTemplate(t)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 p-2.5 text-left"
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
                <div className="flex flex-col justify-center gap-0.5 pr-1.5">
                  <button
                    onClick={() => onEditTemplate(t)}
                    title="編集"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    title="削除"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
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
