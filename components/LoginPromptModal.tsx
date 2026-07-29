"use client";

import Link from "next/link";
import { LogIn, X } from "lucide-react";

/**
 * ゲスト（未ログイン）に「保存にはログインが必要」であることを伝えるモーダル。
 * ・初回編集時に1度だけ（以降はヘッダーのバナーで案内）
 * ・ログインが必要な操作（カレンダー追加・テンプレ保存など）を押したとき
 */
export function LoginPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50">
            <LogIn className="h-4 w-4 text-brand-600" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-800">
              保存するにはログインが必要です
            </h2>
          </div>
          <button
            onClick={onClose}
            title="閉じる"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-gray-600">
          お試し中の変更は<span className="font-semibold">このブラウザにのみ</span>
          保存されています。ログインするとアカウントに保存され、
          他の端末からも同じ予定を見られます。
          <br />
          <span className="text-xs text-gray-500">
            ※ ログインすると、ここで作成した予定はそのまま引き継がれます。
          </span>
        </p>

        <div className="flex gap-2">
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <LogIn className="h-4 w-4" />
            ログイン・新規登録
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
