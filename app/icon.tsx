import { ImageResponse } from "next/og";

// ファビコン。public/ を持たないので next/og で生成する。
// 見た目は components/Logo.tsx のブランド色の角丸に「研」を合わせている。
//
// サイズは48の倍数にすること。Googleの検索結果にファビコンを出す条件の
// 1つが「正方形かつ48pxの倍数」で、32x32だと満たせず、検索結果には
// サイトアイコンの代わりに汎用の地球アイコンが出てしまう。
export const runtime = "edge";
export const size = { width: 48, height: 48 };
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
          fontSize: 30,
          fontWeight: 700,
          borderRadius: 10,
        }}
      >
        研
      </div>
    ),
    size,
  );
}
