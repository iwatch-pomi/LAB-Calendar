"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthForm } from "./AuthForm";

/**
 * ログイン・新規登録をモーダルで行う。
 * 専用ページ(/login)へ遷移させず、カレンダーの上に重ねて表示する。
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  // Esc で閉じる（他モーダルは背景クリックのみだが、入力欄が多いので併設）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Logo />
            <h2 className="mt-3 text-xl font-bold text-gray-800">
              ログイン・新規登録
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              お試し中に作成した予定・ToDo はそのまま引き継がれます。
            </p>
          </div>
          <button
            onClick={onClose}
            title="閉じる"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AuthForm />
      </div>
    </div>
  );
}
