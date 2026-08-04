import type { MetadataRoute } from "next";
import { SITE_LAST_MODIFIED, SITE_URL } from "@/lib/site";

// 公開ページは公式サイトの1枚だけ。
// changeFrequency / priority は検索エンジンに無視されるので入れない。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: SITE_LAST_MODIFIED,
    },
  ];
}
