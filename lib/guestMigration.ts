/**
 * ゲスト（未ログイン）中にブラウザへ作った予定・ToDo を、ログイン後の
 * アカウントへ書き移す処理。
 *
 * ここに切り出しているのは、**localStorage を消す判断を誤ると
 * ユーザーのデータが失われる**ためです。テストできる形にしておく必要があります
 * （`vitest.config.mts` の対象は `lib/**` だけで、`components/` は入りません）。
 *
 * この関数は「サーバーへ書き込んで、成功した id を返す」だけです。
 * localStorage には一切触りません。何を消すかは呼び出し側が結果を見て決めます。
 */

import type { Task, Todo } from "@/lib/types";

/** 書き込み先。実体は TanStack Query の mutateAsync、テストでは偽物を渡す */
export interface MigrationIO {
  createTask(args: {
    title: string;
    start_time: string;
    end_time: string;
    experiment_id: string | null;
    subtitle: string | null;
    is_wait: boolean;
  }): Promise<unknown>;
  addTodo(args: {
    title: string;
    sort_order: number;
    due_at: string | null;
  }): Promise<unknown>;
}

export interface MigrationResult {
  /** 保存できた予定の id（localStorage から消してよいもの） */
  okTaskIds: string[];
  /** 保存できた ToDo の id（同上） */
  okTodoIds: string[];
  /** 保存できなかった件数。1件でもあれば localStorage は残す */
  failed: number;
}

/**
 * 1件ずつ書き込み、失敗しても残りを続ける。
 *
 * 引き継ぎで落ちる情報（status / notes / task_kind / equipment_id / 実験との
 * 紐付け）は元々の割り切りです。ゲストの実験・装置の id はサーバーに存在しない
 * ため、単発の予定として保存します。ここを広げると「移行に失敗して消える」
 * 経路が増えるので、意図的にそのままにしています。
 */
export async function migrateGuestData(
  input: { tasks: Task[]; todos: Todo[] },
  io: MigrationIO,
): Promise<MigrationResult> {
  const okTaskIds: string[] = [];
  const okTodoIds: string[] = [];
  let failed = 0;

  for (const t of input.tasks) {
    try {
      await io.createTask({
        title: t.title,
        start_time: t.start_time,
        end_time: t.end_time,
        experiment_id: null,
        subtitle: t.subtitle,
        is_wait: t.is_wait,
      });
      okTaskIds.push(t.id);
    } catch {
      failed++;
    }
  }

  // sort_order は既存の ToDo より後ろに来るよう大きめの値から振る。
  // 失敗した分で番号が詰まらないよう、添字（i）で決める。
  for (const [i, td] of input.todos.entries()) {
    try {
      await io.addTodo({
        title: td.title,
        sort_order: 1000 + i,
        due_at: td.due_at,
      });
      okTodoIds.push(td.id);
    } catch {
      failed++;
    }
  }

  return { okTaskIds, okTodoIds, failed };
}
