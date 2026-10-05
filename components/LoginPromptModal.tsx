"use client";

import { Info, LogIn, X } from "lucide-react";
import { useGuest } from "./GuestProvider";
import { AUTH_ENABLED } from "@/lib/authGate";

/**
 * ゲスト（未ログイン）に「保存にはログインが必要」であることを伝えるモーダル。
 * ・初回編集時に1度だけ（以降はヘッダーのバナーで案内）
 * ・ログインが必要な操作（カレンダー追加・テンプレ保存など）を押したとき
 *
 * 受付を止めている間（lib/authGate.ts）は、ログインを勧めると案内が嘘になるので
 * 「今は受け付けていない」と伝えるだけにする。操作自体はできないままなので、
 * 黙って何も出さないより、理由が分かるほうがよい。
 */
export function LoginPromptModal({ onClose }: { onClose: () => void }) {
  const { openAuth } = useGuest();
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
            {AUTH_ENABLED ? (
              <LogIn className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            ) : (
              <Info className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {AUTH_ENABLED
                ? "保存するにはログインが必要です"
                : "この操作はアカウントが必要です"}
            </h2>
          </div>
          <button
            onClick={onClose}
            title="閉じる"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {AUTH_ENABLED ? (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            お試し中の変更は<span className="font-semibold">このブラウザにのみ</span>
            保存されています。ログインするとアカウントに保存され、
            他の端末からも同じ予定を見られます。
            <br />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ※ ログインすると、ここで作成した予定はそのまま引き継がれます。
            </span>
          </p>
        ) : (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            ただいま、アカウントの受付を
            <span className="font-semibold">停止しています</span>。
            そのため、この操作は今はご利用いただけません。
            <br />
            カレンダーの作成・編集はこのままお使いいただけます。
            <br />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ※ 変更はこのブラウザにのみ保存されます。閲覧履歴やサイトデータを
              消すと失われるため、大切な予定は控えを残してください。
            </span>
          </p>
        )}

        <div className="flex gap-2">
          {AUTH_ENABLED && (
            <button
              onClick={openAuth}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <LogIn className="h-4 w-4" />
              ログイン・新規登録
            </button>
          )}
          <button
            onClick={onClose}
            className={
              AUTH_ENABLED
                ? "rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                : "flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            }
          >
            {AUTH_ENABLED ? "あとで" : "閉じる"}
          </button>
        </div>
      </div>
    </div>
  );
}
