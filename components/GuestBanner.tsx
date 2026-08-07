"use client";

import { Info, LogIn, CheckCircle2, AlertTriangle } from "lucide-react";
import { useGuest } from "./GuestProvider";

/** ゲスト中に常時出す「このブラウザにのみ保存」の案内バー */
export function GuestBanner() {
  const { openAuth } = useGuest();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
      <span className="flex min-w-0 items-center gap-1.5 text-amber-900 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="min-w-0">
          お試し中：変更は<span className="font-semibold">このブラウザにのみ</span>
          保存されています
        </span>
      </span>
      <button
        onClick={openAuth}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
      >
        <LogIn className="h-3.5 w-3.5" />
        ログインして保存
      </button>
    </div>
  );
}

/**
 * ログイン直後、ゲスト中のデータを引き継いだ結果を知らせるバー。
 *
 * 保存に失敗した分がある場合は、失敗を隠さずに件数を出す。以前は成功件数が
 * 0のときバー自体を出しておらず、全件失敗すると「何も起きなかったように見えて
 * ブラウザのデータだけが消える」状態だった。失敗分はブラウザに残してあるので、
 * その旨も伝える（再ログインすると引継ぎがもう一度走る）。
 */
export function MigratedBanner({
  saved,
  failed,
  onClose,
}: {
  saved: number;
  failed: number;
  onClose: () => void;
}) {
  const ok = failed === 0;
  return (
    <div
      className={
        ok
          ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10"
          : "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-500/20 dark:bg-amber-500/10"
      }
    >
      <span
        className={
          ok
            ? "flex min-w-0 items-center gap-1.5 text-emerald-900 dark:text-emerald-300"
            : "flex min-w-0 items-center gap-1.5 text-amber-900 dark:text-amber-300"
        }
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span className="min-w-0">
          {ok
            ? `お試し中に作成した ${saved} 件をアカウントに保存しました。`
            : `お試し中に作成した ${failed} 件を保存できませんでした` +
              (saved > 0 ? `（${saved} 件は保存済み）` : "") +
              "。データはこのブラウザに残しています。"}
        </span>
      </span>
      <button
        onClick={onClose}
        className={
          ok
            ? "shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            : "shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
        }
      >
        閉じる
      </button>
    </div>
  );
}
