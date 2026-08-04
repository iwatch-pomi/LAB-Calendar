import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// SNS やチャットに貼られたときのカード画像。
// public/ に画像を置かずに済むよう next/og で生成する。
export const runtime = "edge";
export const alt = "ラボカレ｜卒業研究のスケジュール管理アプリ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f8fa",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#1aa079",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            研
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#1f2937" }}>
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 40,
            fontWeight: 700,
            color: "#374151",
            textAlign: "center",
          }}
        >
          卒業研究のスケジュール管理アプリ
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 26,
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          実験テンプレートから予定を一括登録。進捗の共有も。
        </div>
      </div>
    ),
    size,
  );
}
