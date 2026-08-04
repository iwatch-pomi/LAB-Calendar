"use client";

import type { Rect } from "@/lib/tourPlacement";

/**
 * チュートリアルのハイライト（スポットライト）。描画だけを担当する。
 *
 * 暗幕と枠を「1枚の div の box-shadow」で同時に描く:
 *   box-shadow: 0 0 0 3px <枠>, 0 0 0 9999px <暗幕>
 * こうすると対象要素を持ち上げたり複製したりせずに済むので、サイドバー内の
 * 既存の z-index（ポップオーバー等）に一切手を入れなくてよい。
 * 影は「先に書いたものが上」に描かれるため、枠を暗幕より前に書くこと。
 */
export function TourSpotlight({ rect }: { rect: Rect }) {
  const style = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };

  return (
    <>
      {/* 暗幕＋枠。色は dark: を効かせたいので Tailwind クラス側に持たせ、
          style には幾何だけを渡す（ダークは暗幕を濃くしないと沈まない）。 */}
      <div
        aria-hidden
        style={style}
        className="pointer-events-none absolute rounded-xl transition-opacity duration-150 shadow-[0_0_0_3px_rgba(26,160,121,0.9),0_0_0_9999px_rgba(0,0,0,0.45)] dark:shadow-[0_0_0_3px_rgba(61,187,144,0.95),0_0_0_9999px_rgba(0,0,0,0.68)]"
      />
      {/* 脈動は別の div に重ねる。animate-pulse-move は box-shadow を
          アニメーションさせるので、上の div に付けると暗幕が消えてしまう。 */}
      <div
        aria-hidden
        style={style}
        className="pointer-events-none absolute rounded-xl animate-pulse-move motion-reduce:animate-none"
      />
    </>
  );
}
