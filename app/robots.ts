import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // ログインが要る画面はクロールさせない。
      // ただし disallow はインデックス登録を止めるものではないので、
      // 各ページ側でも metadata の robots: { index: false } を付けている。
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
