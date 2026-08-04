"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import type { FeatureFlags } from "@/lib/types";
import { Sprout, Check } from "lucide-react";

interface Domain {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  flags: FeatureFlags;
}

// 一旦: 化学系/物理・工学系は非表示（生物系のみ選択可）
const DOMAINS: Domain[] = [
  {
    key: "bio",
    title: "生物系",
    desc: "培養・形質転換・発現精製など。待機時間を自動でブロック化。",
    icon: <Sprout className="h-5 w-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    flags: { bio_culture_lineage: true },
  },
];

export function Onboarding({
  onComplete,
  saving,
}: {
  onComplete: (flags: FeatureFlags) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function complete() {
    const flags: FeatureFlags = { onboarded: true };
    for (const d of DOMAINS) {
      if (selected.has(d.key)) Object.assign(flags, d.flags);
    }
    onComplete(flags);
  }

  const isOther = selected.size === 0;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#f6f8fa] p-4 dark:bg-gray-950">
      <div className="w-full max-w-2xl">
        <div className="mb-5">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          ようこそ！まず研究分野を教えてください
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          分野に合わせて実験テンプレートや待機時間の扱いを最適化します。
          <span className="font-medium text-gray-600 dark:text-gray-300">
            あとから「マイページ → 実験モード」でいつでも変更・追加できます。
          </span>
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOMAINS.map((d) => {
            const on = selected.has(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggle(d.key)}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  on
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-400 dark:border-brand-600 dark:bg-brand-900/20 dark:ring-brand-600"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                }`}
              >
                {on && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${d.iconBg}`}
                >
                  {d.icon}
                </span>
                <div className="mt-3 text-base font-bold text-gray-800 dark:text-gray-100">
                  {d.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {d.desc}
                </p>
              </button>
            );
          })}

          {/* その他 / あとで決める */}
          <button
            onClick={() => setSelected(new Set())}
            className={`rounded-2xl border border-dashed p-4 text-left transition ${
              isOther
                ? "border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800"
                : "border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
            }`}
          >
            <div className="mt-3 text-base font-bold text-gray-700 dark:text-gray-200">
              その他 / あとで決める
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
              汎用テンプレートで始めます。
            </p>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isOther
              ? "モードなしで開始します"
              : `${selected.size} 個の分野を選択中`}
          </p>
          <button
            onClick={complete}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "設定中…" : "はじめる"}
          </button>
        </div>
      </div>
    </div>
  );
}
