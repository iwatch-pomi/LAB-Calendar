"use client";

import { Sparkles, X } from "lucide-react";

/**
 * 未ログインでの初回アクセス時に1度だけ、表示中の内容が
 * デモデータであることを知らせるモーダル。
 */
export function DemoNoticeModal({ onClose }: { onClose: () => void }) {
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
            <Sparkles className="h-4 w-4 text-brand-600" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-800">
              これはデモデータです
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
          今表示されている実験・予定・ToDo は、機能を試していただくための
          <span className="font-semibold">サンプルデータ</span>です。
          自由に編集して使い心地を試せます。
          <br />
          <span className="text-xs text-gray-500">
            ※ 変更はこのブラウザにのみ保存されます。ログインするとアカウントに保存され、他の端末からも見られます。
          </span>
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          わかった
        </button>
      </div>
    </div>
  );
}
