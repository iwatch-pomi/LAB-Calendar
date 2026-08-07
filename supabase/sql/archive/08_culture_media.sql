-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  08_culture_media.sql
-- 「継代培養を管理」ページ（培地管理システム）用のテーブルと、
-- 予定の種別「培養時間」を表す tasks.task_kind カラムを追加します。
--
-- ・tasks.task_kind: operation=実験操作 / wait=待機時間 / culture=培養時間
-- ・culture_media: 培地（作成日・期限日・廃棄日・継代元・紐づく培養時間タスク）
--
-- 01〜07 の後に実行してください。
-- =============================================================

-- 1) 予定の種別カラム（培養時間を追加）
alter table public.tasks
  add column if not exists task_kind text not null default 'operation'
  check (task_kind in ('operation','wait','culture'));

-- 2) 培地テーブル
create table if not exists public.culture_media (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  created_date   date not null default current_date,                          -- 作成日
  expiry_date    date,                                                        -- 期限日
  disposed_date  date,                                                        -- 廃棄日（廃棄済み）
  parent_id      uuid references public.culture_media(id) on delete set null, -- 継代元（親培地）
  source_task_id uuid references public.tasks(id) on delete set null,         -- 紐づく「培養時間」タスク
  note           text,
  created_at     timestamptz not null default now()
);

alter table public.culture_media enable row level security;

drop policy if exists culture_media_all on public.culture_media;
create policy culture_media_all on public.culture_media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_culture_media_user   on public.culture_media(user_id);
create index if not exists idx_culture_media_parent on public.culture_media(parent_id);
create index if not exists idx_culture_media_source on public.culture_media(source_task_id);

-- 3) 旧テーブル culture_links は新ページ移行に伴い未使用になりました。
--    不要であれば以下のコメントを外して削除できます（任意・元に戻せません）。
-- drop table if exists public.culture_links;
