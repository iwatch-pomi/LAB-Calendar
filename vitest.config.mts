import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts（真の ESM）なので __dirname は使えない。
// tsconfig の "@/*" -> "./*" と同じ解決をテスト側にも与える。
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
