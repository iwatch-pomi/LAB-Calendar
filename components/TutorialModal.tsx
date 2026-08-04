"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  ListChecks,
  Palette,
  Share2,
  Sparkles,
  Sprout,
  X,
  type LucideIcon,
} from "lucide-react";

interface Slide {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  /** ゲストにだけ添える補足（未ログインでは使えない機能の断り書きなど） */
  guestNote?: string;
}

/**
 * 初回アクセス時に主要機能を1画面ずつ紹介するチュートリアル。
 *
 * 以前は「これはデモデータです」だけを知らせる DemoNoticeModal を出していたが、
 * 何ができるアプリなのかを伝える導線が無かったため、そちらを1ページ目に統合して
 * 置き換えている（初回にモーダルが2枚続けて出るのを避けるため）。
 */
export function TutorialModal({
  isGuest,
  onFinish,
}: {
  isGuest: boolean;
  onFinish: () => void;
}) {
  const slides: Slide[] = [
    {
      icon: Sparkles,
      title: "ラボカレへようこそ",
      body: (
        <>
          卒業研究のスケジュールを、実験の進み方に合わせて管理できるアプリです。
          主な機能をかんたんにご紹介します。
          {isGuest && (
            <>
              <br />
              <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">
                ※ 今表示されている実験・予定・ToDo は、機能を試していただくための
                <span className="font-semibold">サンプルデータ</span>
                です。自由に編集できます（変更はこのブラウザにのみ保存されます）。
              </span>
            </>
          )}
        </>
      ),
    },
    {
      icon: LayoutTemplate,
      title: "テンプレートから予定を一括登録",
      body: (
        <>
          画面右上の<span className="font-semibold">「実験を追加」</span>
          からテンプレートを選ぶと、そこに登録された実験ステップの予定を
          カレンダーへ<span className="font-semibold">まとめて登録</span>
          できます。毎回ひとつずつ入力する必要はありません。
        </>
      ),
    },
    {
      icon: Palette,
      title: "カレンダーは色分けして複数作れる",
      body: (
        <>
          実験ごとにカレンダーを作り、
          <span className="font-semibold">色分けして管理</span>
          できます。左の「カレンダーを追加」から作成でき、
          カレンダー名をクリックするとその実験の予定だけを目立たせて確認できます。
        </>
      ),
    },
    {
      icon: Archive,
      title: "終わった実験はアーカイブ",
      body: (
        <>
          終了した実験のカレンダーは
          <span className="font-semibold">アーカイブ</span>
          して、普段の画面から片付けられます。
          アーカイブした実験はマイページから見返せて、必要になれば復元もできます。
        </>
      ),
    },
    {
      icon: ListChecks,
      title: "ToDoリストも中に入っています",
      body: (
        <>
          「培地を準備する」「装置の予約を確定する」といった細かい作業は、
          左の<span className="font-semibold">今日のToDo</span>
          で管理できます。期限を付けられ、完了した分はマイページに残ります。
        </>
      ),
    },
    {
      icon: Sprout,
      title: "研究に合わせたツールも",
      body: (
        <>
          継代培養の系統（継代ツリー）を記録するツールなどを用意しています。
          必要な人だけが使えるよう、マイページの
          <span className="font-semibold">「実験モード」</span>
          からON / OFFを切り替えられます。
          ツールはご要望に応じて今後も追加していく予定です。
        </>
      ),
      guestNote: "ログインすると使えます。",
    },
    {
      icon: Share2,
      title: "共有して進捗を報告できる",
      body: (
        <>
          カレンダーを教授・先輩・共同研究者に
          <span className="font-semibold">共有</span>
          して進捗を報告できます（相手は閲覧のみで、編集はされません）。
          <span className="font-semibold">研究室</span>
          に参加すれば、主宰がメンバーの予定をまとめて確認することもできます。
        </>
      ),
      guestNote: "ログインすると使えます。",
    },
  ];

  const [page, setPage] = useState(0);
  const last = slides.length - 1;
  const isLast = page === last;

  const next = useCallback(() => setPage((p) => Math.min(p + 1, last)), [last]);
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

  // 読み物なので矢印キーで送れるようにする。Esc はスキップ扱い。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onFinish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onFinish]);

  const slide = slides[page];
  const Icon = slide.icon;

  return (
    // 背景クリックでは閉じない。複数ページの読み物なので、誤タップ1回で
    // 消えると読み直せない（× と「スキップ」は常に出しておく）。
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ラボカレの使い方"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900"
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
            <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{slide.title}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {page + 1} / {slides.length}
            </p>
          </div>
          <button
            onClick={onFinish}
            title="スキップ"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 文章量でカードの高さが跳ねないよう下限を持たせる */}
        <div className="mb-4 min-h-[7.5rem] text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {slide.body}
          {isGuest && slide.guestNote && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">※ {slide.guestNote}</p>
          )}
        </div>

        {/* 進捗ドット */}
        <div className="mb-4 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setPage(i)}
              title={s.title}
              aria-label={`${i + 1}ページ目へ`}
              aria-current={i === page}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-5 bg-brand-500" : "w-1.5 bg-gray-300 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {page > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
              戻る
            </button>
          ) : (
            <button
              onClick={onFinish}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              スキップ
            </button>
          )}

          <button
            onClick={isLast ? onFinish : next}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {isLast ? (
              "はじめる"
            ) : (
              <>
                次へ
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
