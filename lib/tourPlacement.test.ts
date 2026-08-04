import { describe, it, expect } from "vitest";
import {
  placeCard,
  inflateRect,
  intersectRect,
  visibleFraction,
  cardWidth,
  CARD_MAX_WIDTH,
  VIEWPORT_MARGIN,
  TARGET_GAP,
  type Rect,
  type Size,
} from "./tourPlacement";

const DESKTOP: Size = { width: 1440, height: 900 };
const PHONE: Size = { width: 390, height: 844 };
/** デスクトップでの標準的なカード（幅は cardWidth で決まる想定） */
const CARD: Size = { width: 448, height: 260 };

describe("placeCard", () => {
  it("下に余白が十分なら bottom に置き、対象の水平中心に揃う", () => {
    const target: Rect = { top: 80, left: 600, width: 120, height: 40 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP });
    expect(r.placement).toBe("bottom");
    expect(r.top).toBe(80 + 40 + TARGET_GAP);
    // 対象の中心 660 に対してカード中心も 660
    expect(r.left + CARD.width / 2).toBeCloseTo(660);
  });

  it("画面下端の対象は下に入らないので top になる", () => {
    const target: Rect = { top: 820, left: 600, width: 120, height: 40 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP });
    expect(r.placement).toBe("top");
    expect(r.top).toBe(820 - TARGET_GAP - CARD.height);
  });

  it("サイドバー内の縦長の対象は right に置ける（広い画面）", () => {
    const target: Rect = { top: 200, left: 16, width: 232, height: 300 };
    const r = placeCard({
      target,
      card: CARD,
      viewport: DESKTOP,
      prefer: ["right", "bottom"],
    });
    expect(r.placement).toBe("right");
    expect(r.left).toBe(16 + 232 + TARGET_GAP);
    // 縦は対象の中心に揃う
    expect(r.top + CARD.height / 2).toBeCloseTo(350);
  });

  it("狭い画面で右の余白が足りなければ right を飛ばして bottom になる", () => {
    // 390px 幅でサイドバー(264px)が開いている状況。右の余白は 126px しかない
    const target: Rect = { top: 120, left: 16, width: 232, height: 200 };
    const card: Size = { width: cardWidth(PHONE), height: 240 };
    const r = placeCard({
      target,
      card,
      viewport: PHONE,
      prefer: ["right", "bottom"],
    });
    expect(r.placement).toBe("bottom");
  });

  it("左上隅の対象では left が margin にクランプされ、負にならない", () => {
    const target: Rect = { top: 10, left: 8, width: 40, height: 30 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP });
    expect(r.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    expect(r.top).toBeGreaterThanOrEqual(0);
  });

  it("右上隅の対象では left が右端でクランプされる", () => {
    const target: Rect = { top: 10, left: 1380, width: 40, height: 30 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP });
    expect(r.left).toBe(DESKTOP.width - CARD.width - VIEWPORT_MARGIN);
  });

  it("どの辺にも収まらないときは余白が最大の辺を選び、画面内にクランプする", () => {
    // 画面中央に大きめの対象。どの辺にもカード(高さ260/幅448)は収まらない
    const target: Rect = { top: 300, left: 500, width: 500, height: 300 };
    const card: Size = { width: 448, height: 400 };
    const r = placeCard({ target, card, viewport: DESKTOP });
    expect(r.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    expect(r.top + card.height).toBeLessThanOrEqual(DESKTOP.height);
    expect(r.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
  });

  it("対象が画面の大半（両軸60%超）を占めるなら中央に戻す", () => {
    const target: Rect = { top: 50, left: 50, width: 1300, height: 800 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP });
    expect(r.placement).toBe("center");
  });

  it("target が null なら厳密に中央", () => {
    const r = placeCard({ target: null, card: CARD, viewport: DESKTOP });
    expect(r.placement).toBe("center");
    expect(r.left).toBeCloseTo((DESKTOP.width - CARD.width) / 2);
    expect(r.top).toBeCloseTo((DESKTOP.height - CARD.height) / 2);
  });

  it("カードが画面幅いっぱいでも left は margin 以上（負にならない）", () => {
    const target: Rect = { top: 100, left: 100, width: 50, height: 50 };
    const card: Size = { width: 900, height: 200 };
    const r = placeCard({ target, card, viewport: PHONE });
    expect(r.left).toBe(VIEWPORT_MARGIN);
  });

  it("複数の辺が収まるときは prefer の順序が尊重される", () => {
    const target: Rect = { top: 400, left: 700, width: 60, height: 40 };
    const bottomFirst = placeCard({
      target,
      card: CARD,
      viewport: DESKTOP,
      prefer: ["bottom", "right"],
    });
    const rightFirst = placeCard({
      target,
      card: CARD,
      viewport: DESKTOP,
      prefer: ["right", "bottom"],
    });
    expect(bottomFirst.placement).toBe("bottom");
    expect(rightFirst.placement).toBe("right");
  });

  it("gap が効いている", () => {
    const target: Rect = { top: 100, left: 600, width: 100, height: 40 };
    const r = placeCard({ target, card: CARD, viewport: DESKTOP, gap: 30 });
    expect(r.top).toBe(100 + 40 + 30);
  });

  it("横向きスマホでカードが高くても画面外に出ない", () => {
    const landscape: Size = { width: 844, height: 390 };
    const target: Rect = { top: 40, left: 400, width: 80, height: 40 };
    const card: Size = { width: 448, height: 360 };
    const r = placeCard({ target, card, viewport: landscape });
    expect(r.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    expect(r.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
  });
});

describe("inflateRect", () => {
  it("四方に pad だけ広がる", () => {
    const r = inflateRect({ top: 100, left: 100, width: 50, height: 40 }, 6, DESKTOP);
    expect(r).toEqual({ top: 94, left: 94, width: 62, height: 52 });
  });

  it("画面外へはみ出さない", () => {
    const r = inflateRect({ top: 0, left: 0, width: 50, height: 40 }, 10, DESKTOP);
    expect(r.top).toBe(0);
    expect(r.left).toBe(0);
  });

  it("幅0の対象でも NaN や負値を出さない", () => {
    const r = inflateRect({ top: 100, left: 0, width: 0, height: 0 }, 6, DESKTOP);
    expect(r.width).toBeGreaterThanOrEqual(0);
    expect(r.height).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(r.width)).toBe(false);
  });
});

describe("intersectRect / visibleFraction", () => {
  const clip: Rect = { top: 0, left: 0, width: 1440, height: 900 };

  it("完全に内包されていれば 1", () => {
    const t: Rect = { top: 100, left: 100, width: 50, height: 50 };
    expect(visibleFraction(t, clip)).toBe(1);
  });

  it("完全に外なら 0 / null", () => {
    const t: Rect = { top: 2000, left: 100, width: 50, height: 50 };
    expect(intersectRect(t, clip)).toBeNull();
    expect(visibleFraction(t, clip)).toBe(0);
  });

  it("半分だけ見えていれば約0.5", () => {
    const t: Rect = { top: 100, left: -25, width: 50, height: 50 };
    expect(visibleFraction(t, clip)).toBeCloseTo(0.5);
  });

  it("幅0のクリップ矩形（閉じたサイドバー）では 0 になる", () => {
    const collapsed: Rect = { top: 0, left: 0, width: 0, height: 900 };
    const t: Rect = { top: 100, left: 0, width: 264, height: 40 };
    expect(intersectRect(t, collapsed)).toBeNull();
    expect(visibleFraction(t, collapsed)).toBe(0);
  });

  it("辺が接するだけなら 0（重なり無し扱い）", () => {
    const t: Rect = { top: 0, left: 1440, width: 50, height: 50 };
    expect(intersectRect(t, clip)).toBeNull();
  });
});

describe("cardWidth", () => {
  it("広い画面では最大幅", () => {
    expect(cardWidth(DESKTOP)).toBe(CARD_MAX_WIDTH);
  });

  it("狭い画面では左右の余白を引いた幅", () => {
    expect(cardWidth(PHONE)).toBe(390 - VIEWPORT_MARGIN * 2);
  });
});
