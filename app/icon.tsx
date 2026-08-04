import { ImageResponse } from "next/og";

// ファビコン。public/ を持たないので next/og で生成する。
// 見た目は components/Logo.tsx のブランド色の角丸に「研」を合わせている。
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1aa079",
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        研
      </div>
    ),
    size,
  );
}
