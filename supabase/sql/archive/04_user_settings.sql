-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  04_user_settings.sql
-- プロフィールの「設定」で切り替える機能フラグを保存するテーブル。
-- features(jsonb) にフラグを持たせ、将来の機能追加にも対応。
-- 01〜03 の後に実行してください。
-- =============================================================

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  features   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists user_settings_all on public.user_settings;
create policy user_settings_all on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
