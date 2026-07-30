"use client";

import { Info, LogIn, CheckCircle2 } from "lucide-react";
import { useGuest } from "./GuestProvider";

/** ゲスト中に常時出す「このブラウザにのみ保存」の案内バー */
export function GuestBanner() {
  const { openAuth } = useGuest();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-1.5 text-amber-900">
        <Info className="h-4 w-4 shrink-0 text-amber-600" />
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

/** ログイン直後、ゲスト中のデータを引き継いだことを知らせるバー */
export function MigratedBanner({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-1.5 text-emerald-900">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        お試し中に作成した {count} 件をアカウントに保存しました。
      </span>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        閉じる
      </button>
    </div>
  );
}
