"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  intersectRect,
  visibleFraction,
  inflateRect,
  SPOTLIGHT_PAD,
  type Rect,
} from "@/lib/tourPlacement";
import { findTourTarget, type TourAnchor } from "@/lib/tourAnchors";

/** 解決中 / ハイライト中 / 中央フォールバック */
export type TourPhase = "resolving" | "anchored" | "centered";

/** 見えている割合がこれ未満なら「使えない」とみなす */
const MIN_VISIBLE_FRACTION = 0.5;
/** これより小さい矩形はハイライトしても意味がない */
const MIN_SIZE = 8;
/** サイドバーを開けた場合の待ち時間（200ms のアニメ＋描画を見込む） */
const WAIT_WITH_SIDEBAR_MS = 1500;
/** それ以外の待ち時間 */
const WAIT_DEFAULT_MS = 800;

function toRect(r: DOMRect): Rect {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function viewportRect(): Rect {
  return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

/**
 * 対象を切り取っている祖先（overflow が visible でないもの）を集める。
 *
 * サイドバーは閉じていても <aside> 自身は w-[264px] のままで、親側の
 * `w-0 overflow-hidden` が切り取っている。つまり「要素が在るか」だけでは
 * 可視判定にならない。一覧は毎フレームでは変わらないので解決時に1度だけ作り、
 * 追従中は矩形を読むだけにする（getComputedStyle を毎フレーム呼ばないため）。
 */
function collectClippers(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") out.push(a);
  }
  return out;
}

/**
 * 実際に見えている矩形と、その割合を返す。
 * これで「閉じたサイドバー」「折り返しの下にあるToDo」「スクローラより背の高い
 * 対象（穴がはみ出す）」の3つが同時に解ける。
 */
function measure(
  el: HTMLElement,
  clippers: HTMLElement[],
): { rect: Rect; fraction: number } | null {
  let clip = viewportRect();
  for (const a of clippers) {
    const next = intersectRect(clip, toRect(a.getBoundingClientRect()));
    if (!next) return null;
    clip = next;
  }
  const raw = toRect(el.getBoundingClientRect());
  const vis = intersectRect(raw, clip);
  if (!vis) return null;
  return { rect: vis, fraction: visibleFraction(raw, clip) };
}

function usable(m: { rect: Rect; fraction: number } | null): m is { rect: Rect; fraction: number } {
  return (
    !!m &&
    m.fraction >= MIN_VISIBLE_FRACTION &&
    m.rect.width >= MIN_SIZE &&
    m.rect.height >= MIN_SIZE
  );
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

/**
 * 対象要素を探して、その位置を追い続ける。
 *
 * 位置が動く要因が多い（サイドバーの200msアニメ、バナーの出現、リサイズ、
 * サイドバー内のスクロール、フォントの差し替え…）。ResizeObserver では
 * 「サイズは変わらず位置だけ動く」ケース（サイドバーが開いてヘッダーのボタンが
 * 右へずれる等）を取れないので、開いている間だけ rAF で追う。
 * 値が変わったときだけ setState するので、定常状態では再描画されない。
 */
export function useTourTarget(input: {
  anchor: TourAnchor | null;
  /** ステップ番号。変わると解決からやり直す */
  step: number;
  needsSidebar: boolean;
  sidebarOpen: boolean;
  onRequestSidebar: (open: boolean) => void;
}): { phase: TourPhase; rect: Rect | null } {
  const { anchor, step, needsSidebar, sidebarOpen, onRequestSidebar } = input;

  const [phase, setPhase] = useState<TourPhase>(anchor ? "resolving" : "centered");
  const [rect, setRect] = useState<Rect | null>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const clippersRef = useRef<HTMLElement[]>([]);

  // 最新値を effect の外から読む箱（依存配列に入れて解決をやり直させたくない）
  const sidebarOpenRef = useRef(sidebarOpen);
  sidebarOpenRef.current = sidebarOpen;
  const requestSidebarRef = useRef(onRequestSidebar);
  requestSidebarRef.current = onRequestSidebar;

  // 解決フェーズ。まず同期的に1回試すので、通常ケースはちらつかず確定する。
  // （tutorialOpen は false 始まりでサーバー描画されないため SSR 警告は出ない）
  useLayoutEffect(() => {
    elRef.current = null;
    clippersRef.current = [];

    if (!anchor) {
      setPhase("centered");
      setRect(null);
      return;
    }

    setPhase("resolving");
    setRect(null);

    let cancelled = false;
    let raf = 0;
    let scrolled = false;

    const openedSidebar = needsSidebar && !sidebarOpenRef.current;
    if (openedSidebar) requestSidebarRef.current(true);
    const deadline =
      Date.now() + (openedSidebar ? WAIT_WITH_SIDEBAR_MS : WAIT_DEFAULT_MS);

    const attempt = () => {
      if (cancelled) return;
      const el = findTourTarget(anchor);
      if (el) {
        // 見つかった直後に一度だけ画面内へ寄せる。globals.css に
        // scroll-behavior: smooth が無いので "auto" は同期的に効き、
        // 直後の getBoundingClientRect がもう正しい値になる（待ち不要）。
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        }
        const clippers = collectClippers(el);
        const m = measure(el, clippers);
        if (usable(m)) {
          elRef.current = el;
          clippersRef.current = clippers;
          setRect(inflateRect(m.rect, SPOTLIGHT_PAD, viewportRect()));
          setPhase("anchored");
          return;
        }
      }
      if (Date.now() >= deadline) {
        // 対象が無くても内容は必ず出す（中央カードへフォールバック）
        setPhase("centered");
        return;
      }
      raf = requestAnimationFrame(attempt);
    };

    attempt();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [anchor, step, needsSidebar]);

  // 追従フェーズ。ハイライト中だけ回す。
  useEffect(() => {
    if (phase !== "anchored") return;
    let raf = 0;
    let last: Rect | null = null;

    const tick = () => {
      const el = elRef.current;
      if (!el || !document.contains(el)) {
        // 描画し直しで対象が消えた場合、古い位置に穴を残さない
        setPhase("centered");
        setRect(null);
        return;
      }
      const m = measure(el, clippersRef.current);
      if (!usable(m)) {
        setPhase("centered");
        setRect(null);
        return;
      }
      // 丸めてから比較する。サブピクセルの揺れで無限に setState しないため。
      if (!sameRect(m.rect, last)) {
        last = m.rect;
        setRect(inflateRect(m.rect, SPOTLIGHT_PAD, viewportRect()));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, step]);

  return { phase, rect };
}
