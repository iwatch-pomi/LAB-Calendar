// =============================================================
// Apple サインイン用 クライアントシークレット(JWT) 生成スクリプト
// 依存パッケージ不要（Node.js 標準の crypto だけで動きます）。
//
// 使い方（このファイルと同じフォルダに AuthKey_XXXX.p8 を置いて実行）:
//   1) 下の TEAM_ID と CLIENT_ID を自分の値に書き換える
//   2) Apple の .p8 ファイル(AuthKey_XXXX.p8)を同じフォルダに置く
//      ※ Key ID はファイル名から自動取得します
//   3) 実行:  node apple-client-secret.mjs
//   4) 出力された eyJ... を Supabase → Authentication → Providers →
//      Apple → Secret Key (for OAuth) に貼り付け
//
// 値は環境変数でも指定できます:
//   APPLE_TEAM_ID / APPLE_CLIENT_ID / APPLE_KEY_ID / APPLE_P8_PATH
// =============================================================

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ====== ここを自分の値に書き換え ======
const TEAM_ID = process.env.APPLE_TEAM_ID || "XXXXXXXXXX"; // Apple Team ID(10桁)
const CLIENT_ID = process.env.APPLE_CLIENT_ID || "app.labocale.web"; // Services ID
let KEY_ID = process.env.APPLE_KEY_ID || ""; // 空なら .p8 のファイル名から自動取得
// =====================================

// --- .p8 ファイルを探す（同じフォルダの AuthKey_*.p8） ---
function findP8() {
  if (process.env.APPLE_P8_PATH) return process.env.APPLE_P8_PATH;
  const dir = process.cwd();
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^AuthKey_.*\.p8$/i.test(f));
  if (files.length === 0) {
    throw new Error(
      "AuthKey_XXXX.p8 が見つかりません。このスクリプトと同じフォルダに .p8 を置いてください。",
    );
  }
  if (files.length > 1) {
    throw new Error("AuthKey_*.p8 が複数あります: " + files.join(", "));
  }
  return path.join(dir, files[0]);
}

let p8Path;
try {
  p8Path = findP8();
} catch (e) {
  console.error("エラー:", e.message);
  process.exit(1);
}

// Key ID をファイル名から補完（AuthKey_<KEYID>.p8）
if (!KEY_ID) {
  const m = path.basename(p8Path).match(/^AuthKey_(.+)\.p8$/i);
  if (m) KEY_ID = m[1];
}

// --- 入力チェック ---
const errs = [];
if (!/^[A-Z0-9]{10}$/i.test(TEAM_ID))
  errs.push("TEAM_ID が未設定/不正です（10桁の英数字）");
if (!KEY_ID) errs.push("KEY_ID が取得できません（.p8のファイル名 か APPLE_KEY_ID）");
if (!CLIENT_ID || /\s/.test(CLIENT_ID))
  errs.push("CLIENT_ID(Services ID) が未設定です（例: app.labocale.web）");
if (errs.length) {
  console.error("設定エラー:\n- " + errs.join("\n- "));
  process.exit(1);
}

// --- JWT を生成（ES256） ---
const privateKey = fs.readFileSync(p8Path, "utf8");
const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + 180 * 24 * 60 * 60, // 180日（Appleの上限は6ヶ月）
  aud: "https://appleid.apple.com",
  sub: CLIENT_ID,
};

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");
const signingInput = `${b64url(header)}.${b64url(payload)}`;

let secret;
try {
  const signature = crypto
    .sign("sha256", Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: "ieee-p1363", // JWS が要求する raw(r||s) 形式
    })
    .toString("base64url");
  secret = `${signingInput}.${signature}`;
} catch (e) {
  console.error(
    "署名に失敗しました。.p8 の中身が正しいか確認してください（先頭が -----BEGIN PRIVATE KEY-----）。",
  );
  console.error(e.message);
  process.exit(1);
}

// --- 出力 ---
console.log("\n=== Apple Client Secret（Supabase の Secret Key に貼る） ===\n");
console.log(secret);
console.log("\n--- 参考 ---");
console.log("Team ID   :", TEAM_ID);
console.log("Key ID    :", KEY_ID);
console.log("Client ID :", CLIENT_ID);
console.log("有効期限  :", new Date(payload.exp * 1000).toLocaleString());
console.log(
  "\n※ このシークレットは上記の有効期限で失効します。切れたら再実行して差し替えてください。",
);
