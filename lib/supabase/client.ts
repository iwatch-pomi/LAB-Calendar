import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// <Database> を付けているのが要点。テーブル名・列名・RPC の引数と戻り値が
// 型検査の対象になり、DB を変えてコードを直し忘れるとビルドが止まる。
// 型定義は lib/database.types.ts（DBのカタログから起こした自動生成）。
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
