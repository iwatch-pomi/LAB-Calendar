"use client";

import { Sparkles } from "lucide-react";
import { Logo } from "./Logo";

/**
 * 新規登録直後（実験が1件も無い）に1度だけ、デモデータを使うか確認する。
 * 「使う」→ seed_demo_data() を呼ぶ / 「空で始める」→ 何もせず既定のまま。
 * どちらを選んでも demo_seed_asked を立てて、以後は再表示しない。
 */
export function DemoDataChoiceModal({
  onKeep,
  onSkip,
  saving,
}: {
  onKeep: () => void;
  onSkip: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center overflow-y-auto bg-[#f6f8fa] p-4 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-5">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </span>
            <h1 className="mt-1.5 text-lg font-bold leading-snug text-gray-800 dark:text-gray-100">
              サンプルの実験データを使いますか？
            </h1>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            大腸菌タンパク質発現などのサンプル実験・予定・ToDo を用意しています。
            操作感を試してから、自分の実験に置き換えられます。
            <br />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ※ 使わない場合は空の状態から始められます。あとから削除もできます。
            </span>
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onKeep}
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? "準備中…" : "サンプルデータを使う"}
            </button>
            <button
              onClick={onSkip}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              空の状態で始める
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
