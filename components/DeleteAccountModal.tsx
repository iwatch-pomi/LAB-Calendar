"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/site";

/** 実行のために入力してもらう文字列。短すぎると誤操作と区別が付かない */
export const DELETE_CONFIRM_PHRASE = "アカウントを削除";

export interface DeleteAccountCounts {
  experiments: number;
  tasks: number;
  todos: number;
  equipment: number;
  /** 自分が作成した研究室（消えると他のメンバーの所属もなくなる） */
  ownedLabs: string[];
  /** 自分が誰かに共有している件数 */
  shares: number;
}

/**
 * 退会の確認モーダル。
 *
 * 取り消せない操作なので、次の3つを満たすまで実行できないようにしている。
 *  1. 何が消えるかを件数で見せる（「たぶん空だろう」で押させない）
 *  2. 自分以外に影響が出る場合（研究室の作成者）は個別に警告する
 *  3. 決められた文字列を入力させる（誤タップでは到達しない）
 */
export function DeleteAccountModal({
  email,
  counts,
  deleting,
  errorMessage,
  onConfirm,
  onClose,
}: {
  email: string;
  counts: DeleteAccountCounts;
  deleting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim() === DELETE_CONFIRM_PHRASE && !deleting;

  const items = [
    { label: "実験", n: counts.experiments },
    { label: "予定", n: counts.tasks },
    { label: "ToDo", n: counts.todos },
    { label: "使用機器", n: counts.equipment },
    { label: "共有", n: counts.shares },
  ].filter((x) => x.n > 0);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 dark:bg-rose-500/10">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              アカウントを削除しますか？
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            aria-label="閉じる"
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          <span className="font-medium text-gray-800 dark:text-gray-100">
            {email}
          </span>{" "}
          のアカウントと、保存されているデータをすべて削除します。
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            この操作は取り消せません。
          </span>
        </p>

        {items.length > 0 && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
              削除されるもの
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
              {items.map((x) => (
                <li key={x.label}>
                  {x.label} <span className="font-semibold">{x.n}</span> 件
                </li>
              ))}
            </ul>
          </div>
        )}

        {counts.ownedLabs.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              ほかの方にも影響があります
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
              あなたが作成した研究室（
              {counts.ownedLabs.join("、")}
              ）も削除され、
              <span className="font-semibold">
                所属しているメンバー全員がその研究室から外れます。
              </span>
              引き継ぐ場合は、退会せずに別の方へ引き継ぎ方法をご相談ください。
            </p>
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-xs text-gray-600 dark:text-gray-300">
            続けるには{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {DELETE_CONFIRM_PHRASE}
            </span>{" "}
            と入力してください
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={deleting}
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-rose-900/40"
          />
        </label>

        {errorMessage && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {errorMessage}
            <br />
            解決しない場合は {CONTACT_EMAIL} までご連絡ください。
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            やめる
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "削除しています…" : "完全に削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
