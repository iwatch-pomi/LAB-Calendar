import { ImageResponse } from "next/og";

// iOS のホーム画面に追加したときのアイコン。
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        研
      </div>
    ),
    size,
  );
}
