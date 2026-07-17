-- =============================================================
-- ラボカレ  06_todos_completed_at.sql
-- ToDo の完了日時を記録するカラムを追加します。
-- 完了から1日経過したToDoをサイドバーから自動的に隠し、
-- マイページ（プロフィール）の完了履歴で確認できるようにするために使用します。
-- 01〜05 の後に実行してください。
-- =============================================================

alter table public.todos
  add column if not exists completed_at timestamptz;

-- 既に done=true の行は、区別できないため今の時刻を完了日時として設定
-- （既存データはこの実行時点から1日後にサイドバーから隠れます）
update public.todos
  set completed_at = now()
  where done = true and completed_at is null;
