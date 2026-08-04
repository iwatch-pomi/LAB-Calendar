import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider, THEME_ROOT_ATTR } from "@/components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

// ThemeProvider（React の水和後）が .dark を付けるより前に、保存済みの
// テーマで /app /teacher の外枠（[data-theme-root]）のクラスを決めておく。
// これが無いと、ダークモードのユーザーが開くたびに一瞬ライト画面が見えて
// から切り替わる（ちらつき）。<html> には触れない（公式サイトが漏れて
// ダークになってしまうため。ThemeProvider.tsx の THEME_ROOT_ATTR 参照）。
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (!dark) return;
    document.querySelectorAll(${JSON.stringify(`[${THEME_ROOT_ATTR}]`)}).forEach(function (el) {
      el.classList.add("dark");
    });
  } catch (e) {}
})();
`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  // canonical や OG画像を絶対URLに解決するために必要。
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // 各ページは `title` を短く書けば「〇〇｜ラボカレ」になる
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body className="font-sans">
        {/* beforeInteractive: Next.js が自動で <head> に差し込むので
            ここでの見た目上の位置は関係ない。React の水和より前に走る。 */}
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
