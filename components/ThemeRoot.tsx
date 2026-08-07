"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

/**
 * サーバー描画では useLayoutEffect が警告を出すので useEffect に落とす。
 * （クライアントコンポーネントも SSR で1度実行されるため）
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * ダークモードの適用先。`/app` `/teacher` など、ダークにする画面の一番外側に置く。
 *
 * ## なぜコンポーネントにしているか
 *
 * 以前は「目印(data-theme-root)だけを持つ素の div」を各画面が書き、クラスは
 * ThemeProvider が `document.querySelectorAll` でまとめて付けていた。
 * ところが ThemeProvider は app/layout.tsx に置かれていて**画面遷移では
 * 再マウントされない**のに対し、目印の div は**ページ側が持っていて遷移のたびに
 * 作り直される**。そのため「カレンダーと設定を行き来するとダークが外れ、
 * リロードすると戻る」という不具合が起きていた
 * （リロード時だけは app/layout.tsx のインラインスクリプトが付け直すため）。
 *
 * クラスを付ける主体と付けられる要素のライフサイクルがずれているのが原因なので、
 * **適用を要素自身の責任にする**。要素と一緒にマウントされるので、遷移のたびに
 * 必ず正しい状態から始まる。
 *
 * ## 二重に効かせている理由
 *
 * ・className を JSX で出すのが本命。遷移直後の最初の描画から正しく、ちらつかない
 * ・レイアウト効果は保険。ハイドレーション時に React が属性を patch しない場合でも
 *   DOM を状態に合わせる
 *
 * ## なぜ <html> ではなくここなのか
 *
 * Tailwind の `dark:` は祖先に `.dark` があるだけで効くため、`<html>` に付けると
 * ロゴのような共有コンポーネントに `dark:` を足した瞬間、常にライトであるべき
 * 公式サイト（`/`）にまでダーク配色が漏れる。だから対象の画面だけに付ける。
 *
 * なお `.dark` と `dark:bg-...` を同じ要素に付けても背景色は付かない
 * （`.dark .bg-...` という子孫セレクタにコンパイルされるため）。この外枠は
 * 目印に徹し、実際のスタイルは children 側の div に持たせること。
 */
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    ref.current?.classList.toggle("dark", dark);
  }, [dark]);

  return (
    // サーバーは localStorage を読めないので必ずライトで描画される。
    // ハイドレーション前に app/layout.tsx のスクリプトが DOM を直すので
    // 実際の見た目はズレないが、React の警告だけは抑止する。
    <div
      ref={ref}
      data-theme-root
      className={dark ? "dark" : undefined}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
