-- =============================================================
-- ラボカレ  05_culture_links.sql
-- 継代培養の親子リンク（前培養→本培養、継代元→継代先 などの系統）を
-- 手動登録するためのテーブル。培養リネージュ記録機能で使用します。
-- 01〜04 の後に実行してください。
-- =============================================================

create table if not exists public.culture_links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  parent_task_id uuid not null references public.tasks(id) on delete cascade,
  child_task_id  uuid not null references public.tasks(id) on delete cascade,
  passage_no     int,
  note           text,
  created_at     timestamptz not null default now(),
  unique (parent_task_id, child_task_id),
  check (parent_task_id <> child_task_id)
);

alter table public.culture_links enable row level security;

drop policy if exists culture_links_all on public.culture_links;
create policy culture_links_all on public.culture_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_culture_links_user   on public.culture_links(user_id);
create index if not exists idx_culture_links_parent on public.culture_links(parent_task_id);
create index if not exists idx_culture_links_child  on public.culture_links(child_task_id);
