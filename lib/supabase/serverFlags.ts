import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureFlags } from "@/lib/types";
import { isTeacher } from "@/lib/role";

/**
 * サーバー側で user_settings.features を読む。
 *
 * 呼び出し口が3つ（/app のリダイレクト・/profile の初期値・認証コールバックの
 * 行き先判定）あり、いずれも「行が無い／読めないときは学生として扱う」という
 * 同じ規則に依存している。各所で書くとズレるのでここに集約する。
 *
 * 新規アカウントは最初の書き込みまで user_settings に行が無いので、
 * 「行が無い」は例外ではなく通常の状態。
 */
export async function getServerFeatureFlags(
  supabase: SupabaseClient,
  userId: string,
): Promise<FeatureFlags> {
  const { data } = await supabase
    .from("user_settings")
    .select("features")
    .eq("user_id", userId)
    .maybeSingle();
  return ((data?.features as FeatureFlags) ?? {}) as FeatureFlags;
}

/**
 * サーバー側の教授判定。読み取りに失敗したら必ず false（＝学生）に倒す。
 *
 * 誤判定の向きが重要。学生扱いに倒れた教授は空のカレンダーが見えるだけで
 * 自力で管理画面へ移動できるが、逆に倒れると学生がアプリから締め出される。
 * 判定そのものは lib/role.ts の isTeacher() を使い、クライアント側と
 * 必ず同じ意味（厳密な === true）になるようにする。
 */
export async function isTeacherServer(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    return isTeacher(await getServerFeatureFlags(supabase, userId));
  } catch {
    return false;
  }
}
