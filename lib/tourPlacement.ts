/**
 * チュートリアル（コーチマーク）の配置計算。
 *
 * 「対象をハイライトし、その脇に説明カードを出す」ための矩形計算をまとめる。
 * 画面端・狭い画面・スクロールで見切れた対象など、条件分岐が多くて静かに壊れ
 * やすいので、DOM に一切触れない純粋関数にしてテストで固める
 * （lib/tutorial.ts / lib/reschedule.ts と同じ方針）。
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Placement = "bottom" | "top" | "right" | "left" | "center";

/** ハイライト枠と対象の隙間 */
export const SPOTLIGHT_PAD = 6;
/** 対象と説明カードの隙間 */
export const TARGET_GAP = 12;
/** 画面端に最低限あけておく余白 */
export const VIEWPORT_MARGIN = 12;
/** 説明カードの最大幅（Tailwind の max-w-md と同値） */
export const CARD_MAX_WIDTH = 448;
/**
 * 対象が画面のこの割合より大きいと、脇にカードを置く場所が無い。
 * そのときは素直に中央表示へ戻す。
 */
export const OVERSIZE_RATIO = 0.6;

const DEFAULT_PREFER: Placement[] = ["bottom", "top", "right", "left"];

function clamp(value: number, min: number, max: number): number {
  // max < min（カードが入りきらない）ときは min 側に寄せる。
  // 逆順に clamp すると画面外の負値になってしまう。
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** 2つの矩形の交差。重なりが無ければ null */
export function intersectRect(a: Rect, b: Rect): Rect | null {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  if (right <= left || bottom <= top) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/**
 * clip に対して target の何割が見えているか（0..1）。
 * 閉じたサイドバー（幅0でクリップされる）を「見えていない」と判定するのに使う。
 */
export function visibleFraction(target: Rect, clip: Rect): number {
  const area = target.width * target.height;
  if (area <= 0) return 0;
  const vis = intersectRect(target, clip);
  if (!vis) return 0;
  return (vis.width * vis.height) / area;
}

/** 対象を pad だけ広げる。画面外へはみ出さないように収める */
export function inflateRect(r: Rect, pad: number, viewport: Size): Rect {
  const top = Math.max(0, r.top - pad);
  const left = Math.max(0, r.left - pad);
  const bottom = Math.min(viewport.height, r.top + r.height + pad);
  const right = Math.min(viewport.width, r.left + r.width + pad);
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * 説明カードの幅。位置を決める前に確定させる。
 *
 * 幅を可変（内容なり）にすると「位置がサイズに依存し、サイズが位置に依存する」
 * 測定ループになるため、幅はここで決め打ちし、高さだけ実測する。
 */
export function cardWidth(viewport: Size, margin: number = VIEWPORT_MARGIN): number {
  return Math.min(CARD_MAX_WIDTH, Math.max(0, viewport.width - margin * 2));
}

/**
 * 対象の脇に説明カードを置く位置を決める。
 * target が null（アンカー無し）のときは画面中央。
 */
export function placeCard(input: {
  target: Rect | null;
  card: Size;
  viewport: Size;
  gap?: number;
  margin?: number;
  prefer?: Placement[];
}): { top: number; left: number; placement: Placement } {
  const {
    target,
    card,
    viewport,
    gap = TARGET_GAP,
    margin = VIEWPORT_MARGIN,
    prefer = DEFAULT_PREFER,
  } = input;

  const centered = () => ({
    top: Math.max(margin, (viewport.height - card.height) / 2),
    left: Math.max(margin, (viewport.width - card.width) / 2),
    placement: "center" as const,
  });

  if (!target) return centered();

  // 対象が画面の大半を占めるなら、脇に置いても隠れてしまう。
  if (
    target.width > viewport.width * OVERSIZE_RATIO &&
    target.height > viewport.height * OVERSIZE_RATIO
  ) {
    return centered();
  }

  const space: Record<Exclude<Placement, "center">, number> = {
    bottom: viewport.height - (target.top + target.height) - gap - margin,
    top: target.top - gap - margin,
    right: viewport.width - (target.left + target.width) - gap - margin,
    left: target.left - gap - margin,
  };

  const needed = (p: Exclude<Placement, "center">) =>
    p === "bottom" || p === "top" ? card.height : card.width;

  const sides = prefer.filter(
    (p): p is Exclude<Placement, "center"> => p !== "center",
  );

  // 収まる辺を優先順で探し、無ければ一番余白が広い辺に置く（優先順で同着解決）。
  let placement = sides.find((p) => needed(p) <= space[p]);
  if (!placement) {
    placement = sides.reduce((best, p) => (space[p] > space[best] ? p : best), sides[0]);
  }
  if (!placement) return centered();

  if (placement === "bottom" || placement === "top") {
    const top =
      placement === "bottom"
        ? target.top + target.height + gap
        : target.top - gap - card.height;
    const left = target.left + target.width / 2 - card.width / 2;
    return {
      top: clamp(top, margin, viewport.height - card.height - margin),
      left: clamp(left, margin, viewport.width - card.width - margin),
      placement,
    };
  }

  const left =
    placement === "right"
      ? target.left + target.width + gap
      : target.left - gap - card.width;
  const top = target.top + target.height / 2 - card.height / 2;
  return {
    top: clamp(top, margin, viewport.height - card.height - margin),
    left: clamp(left, margin, viewport.width - card.width - margin),
    placement,
  };
}
