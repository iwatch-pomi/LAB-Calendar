-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  07_experiments_archived.sql
-- 実験を「アーカイブ」（一覧から隠すが削除はしない）できるように
-- experiments.archived カラムを追加します。
-- アーカイブした実験はマイページ（プロフィール）で確認・復元できます。
-- 01〜06 の後に実行してください。
-- =============================================================

alter table public.experiments
  add column if not exists archived boolean not null default false;

create index if not exists idx_experiments_archived
  on public.experiments(user_id, archived);
