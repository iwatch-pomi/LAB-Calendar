import type { MetadataRoute } from "next";
import {
  SITE_LAST_MODIFIED,
  SITE_URL,
  TERMS_PATH,
  PRIVACY_PATH,
} from "@/lib/site";

// 公開ページは公式サイトと、利用規約・プライバシーポリシー。
// changeFrequency / priority は検索エンジンに無視されるので入れない。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: SITE_LAST_MODIFIED,
    },
    {
      url: `${SITE_URL}${TERMS_PATH}`,
      lastModified: SITE_LAST_MODIFIED,
    },
    {
      url: `${SITE_URL}${PRIVACY_PATH}`,
      lastModified: SITE_LAST_MODIFIED,
    },
  ];
}
