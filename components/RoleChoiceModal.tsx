"use client";

import { GraduationCap, Users, X } from "lucide-react";

/**
 * 初回ログイン時に「学生として使うか / 教授・指導者として使うか」を聞く。
 *
 * 教授は自分のカレンダーを持たず学生の予定を見るだけなので、
 * カレンダー側のオンボーディング（デモデータ選択・研究分野の選択・
 * チュートリアル）を見せる意味が無い。ここで先に分岐させる。
 */
export function RoleChoiceModal({
  initial,
  saving,
  onChoose,
  onDismiss,
}: {
  /** 教授の入口(/teacher)から来た場合に教授を強調する */
  initial?: "student" | "teacher";
  saving: boolean;
  onChoose: (isTeacher: boolean) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[68] grid place-items-center overflow-y-auto bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="利用形態の選択"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-1 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-800">
              どちらの使い方をしますか？
            </h2>
          </div>
          {/* 保存に失敗しても閉じられない画面にしないため、必ず逃げ道を残す */}
          <button
            onClick={onDismiss}
            title="あとで決める"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">
          あとからマイページで変更できます。
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => onChoose(false)}
            disabled={saving}
            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition disabled:opacity-60 ${
              initial === "teacher"
                ? "border-gray-200 hover:border-brand-300 hover:bg-brand-50/40"
                : "border-brand-300 bg-brand-50/40 hover:bg-brand-50"
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50">
              <GraduationCap className="h-4 w-4 text-brand-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-800">
                学生として使う
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                自分の実験カレンダーを作って予定を管理します。教授や先輩に共有して
                進捗を報告できます。
              </span>
            </span>
          </button>

          <button
            onClick={() => onChoose(true)}
            disabled={saving}
            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition disabled:opacity-60 ${
              initial === "teacher"
                ? "border-brand-300 bg-brand-50/40 hover:bg-brand-50"
                : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/40"
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50">
              <Users className="h-4 w-4 text-brand-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-800">
                教授・指導者として使う
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                自分のカレンダーは作らず、共有された学生の予定をまとめて確認します。
                研究室を作って学生を招くこともできます。
              </span>
            </span>
          </button>
        </div>

        {saving && (
          <p className="mt-3 text-center text-xs text-gray-400">保存中…</p>
        )}
      </div>
    </div>
  );
}
