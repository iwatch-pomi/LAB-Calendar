"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutTemplate,
  ListChecks,
  Palette,
  Share2,
  Sparkles,
  Sprout,
  X,
  type LucideIcon,
} from "lucide-react";
import { TOUR_ANCHORS, type TourAnchor } from "@/lib/tourAnchors";
import { placeCard, cardWidth, type Placement } from "@/lib/tourPlacement";
import { TourSpotlight } from "./TourSpotlight";
import { useTourTarget } from "./useTourTarget";

interface Slide {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  /** ゲストにだけ添える補足（未ログインでは使えない機能の断り書きなど） */
  guestNote?: string;
  /** ハイライトする対象。未指定なら中央に出す */
  anchor?: TourAnchor;
  /** 対象がサイドバー内にあるか（閉じていれば一時的に開く） */
  needsSidebar?: boolean;
  /** カードを置きたい向きの優先順 */
  prefer?: Placement[];
}

/**
 * 初回アクセス時に主要機能を紹介するチュートリアル。
 *
 * 文章だけで「画面右上の…」と説明しても場所が伝わらないため、対象の要素を
 * 実際に切り抜いてハイライトし、その脇に説明カードを出すコーチマーク形式にする。
 * 対象が無い場合（ゲストには存在しない機能、実験0件など）は、内容を落とさずに
 * 中央のカードへフォールバックする。
 */
export function TutorialModal({
  isGuest,
  onFinish,
  sidebarOpen,
  onRequestSidebar,
}: {
  isGuest: boolean;
  onFinish: () => void;
  sidebarOpen: boolean;
  onRequestSidebar: (open: boolean) => void;
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
          カレンダー上部の
          <span className="font-semibold">「実験を追加」（＋）</span>
          ボタンからテンプレートを選ぶと、そこに登録された実験ステップの予定を
          カレンダーへ<span className="font-semibold">まとめて登録</span>
          できます。毎回ひとつずつ入力する必要はありません。
        </>
      ),
      anchor: TOUR_ANCHORS.addExperiment,
      prefer: ["bottom", "left"],
    },
    {
      icon: Palette,
      title: "カレンダーは色分けして複数作れる",
      body: (
        <>
          実験ごとにカレンダーを作り、
          <span className="font-semibold">色分けして管理</span>
          できます。<span className="font-semibold">「カレンダーを追加」</span>
          から作成でき、カレンダー名をクリックするとその実験の予定だけを
          目立たせて確認できます。
        </>
      ),
      anchor: TOUR_ANCHORS.experimentList,
      needsSidebar: true,
      prefer: ["right", "bottom"],
    },
    {
      icon: Archive,
      title: "終わった実験はアーカイブ",
      body: (
        <>
          終了した実験のカレンダーは、カード右上の
          <span className="font-semibold">アーカイブ</span>
          ボタンで普段の画面から片付けられます。
          アーカイブした実験はマイページから見返せて、必要になれば復元もできます。
        </>
      ),
      anchor: TOUR_ANCHORS.experimentArchive,
      needsSidebar: true,
      prefer: ["right", "bottom", "top"],
    },
    {
      icon: ListChecks,
      title: "ToDoリストも中に入っています",
      body: (
        <>
          「培地を準備する」「装置の予約を確定する」といった細かい作業は、
          <span className="font-semibold">「今日のToDo」</span>
          で管理できます。期限を付けられ、完了した分はマイページに残ります。
        </>
      ),
      anchor: TOUR_ANCHORS.todoSection,
      needsSidebar: true,
      prefer: ["right", "top"],
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
      anchor: TOUR_ANCHORS.cultureLink,
      needsSidebar: true,
      prefer: ["right", "bottom"],
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
      anchor: TOUR_ANCHORS.shareLinks,
      needsSidebar: true,
      prefer: ["right", "bottom"],
    },
    {
      icon: HelpCircle,
      title: "いつでもここから見返せます",
      body: (
        <>
          この案内は<span className="font-semibold">「使い方」</span>
          からいつでも開き直せます。操作に迷ったら、ここから確認してください。
        </>
      ),
      anchor: TOUR_ANCHORS.helpButton,
      needsSidebar: true,
      prefer: ["right", "bottom"],
    },
  ];

  const [page, setPage] = useState(0);
  const last = slides.length - 1;
  const isLast = page === last;
  const slide = slides[page];
  const Icon = slide.icon;
  const titleId = useId();

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

  const onRequestSidebarRef = useRef(onRequestSidebar);
  onRequestSidebarRef.current = onRequestSidebar;

  // 案内のために一時的にサイドバーを開くので、終了時に元へ戻す。
  // チュートリアル中は操作がブロックされていてユーザーが動かせないため、
  // マウント時の値が「元の状態」で正しい。
  // 全ての退出経路（完了/スキップ/×/Esc/認証モーダル/予定モーダル）が
  // アンマウントを通るので、後始末はここ1箇所で足りる。
  // 開発時は StrictMode で一度余計に走るが、再マウント側が開き直すので実害は無い。
  const sidebarAtStart = useRef(sidebarOpen);
  useEffect(
    () => () => {
      onRequestSidebarRef.current(sidebarAtStart.current);
    },
    [],
  );

  const { phase, rect } = useTourTarget({
    anchor: slide.anchor ?? null,
    step: page,
    needsSidebar: !!slide.needsSidebar,
    sidebarOpen,
    onRequestSidebar,
  });

  // カードの位置。幅は先に決めて（測定のループを避ける）、高さだけ実測する。
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = cardRef.current?.offsetHeight ?? 0;
      setCardHeight((prevH) => (Math.round(prevH) === Math.round(h) ? prevH : h));
      setViewport((v) =>
        v.width === window.innerWidth && v.height === window.innerHeight
          ? v
          : { width: window.innerWidth, height: window.innerHeight },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const anchored = phase === "anchored" && !!rect;
  const width = viewport.width ? cardWidth(viewport) : undefined;
  const placed =
    anchored && viewport.width && cardHeight
      ? placeCard({
          target: rect,
          card: { width: width!, height: cardHeight },
          viewport,
          prefer: slide.prefer,
        })
      : null;

  return (
    // 背景クリックでは閉じない。複数ページの読み物なので、誤タップ1回で
    // 消えると読み直せない（× と「スキップ」は常に出しておく）。
    // このオーバーレイが操作のブロックも兼ねる（pointer-events を外さないこと）。
    // アプリrootが h-screen overflow-hidden なので文書のスクロールロックは不要。
    // ポータルは使わない: .dark は [data-theme-root] の子孫にしか効かないため、
    // body へ移すとダークモードでライト表示になってしまう。
    <div
      className={`fixed inset-0 z-[70] ${
        anchored ? "" : "grid place-items-center bg-black/30 p-4"
      }`}
    >
      {anchored && rect && <TourSpotlight rect={rect} />}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          placed
            ? { position: "absolute", top: placed.top, left: placed.left, width }
            : undefined
        }
        className={`relative z-10 w-full rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 ${
          placed ? "" : "max-w-md"
        }`}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
            <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-base font-bold text-gray-800 dark:text-gray-100"
            >
              {slide.title}
            </h2>
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

        {/* 中央表示のときだけ高さの下限を持たせる（文章量でカードが跳ねないため）。
            ハイライト中は対象の脇に収める必要があるので自然な高さにする。 */}
        <div
          aria-live="polite"
          className={`mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300 ${
            placed ? "" : "min-h-[7.5rem]"
          }`}
        >
          {slide.body}
          {isGuest && slide.guestNote && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ※ {slide.guestNote}
            </p>
          )}
        </div>

        {/* 進捗ドット */}
        <div className="mb-4 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
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
            autoFocus
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
