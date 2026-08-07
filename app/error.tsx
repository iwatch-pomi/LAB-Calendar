"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { ThemeRoot } from "@/components/ThemeRoot";

/**
 * 想定外の例外で画面が真っ白になるのを防ぐ受け皿。App Router が自動で拾う。
 *
 * 「読み込めなかった」と「データが無い」はユーザーには区別が付かない。
 * 何も出ないと『自分のデータが消えた』ように見えるので、必ず何か出す。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel のログに残す（ユーザーには digest だけ見せる）
    console.error(error);
  }, [error]);

  return (
    <ThemeRoot>
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] p-6 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            画面を読み込めませんでした
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            一時的な不具合の可能性があります。データは保存されたままです。
            もう一度お試しください。
          </p>
          <button
            onClick={reset}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <RotateCw className="h-4 w-4" />
            再試行
          </button>
          {error.digest && (
            <p className="mt-4 text-[11px] text-gray-400 dark:text-gray-600">
              エラーID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </ThemeRoot>
  );
}
