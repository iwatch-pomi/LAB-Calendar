-- =============================================================
-- ラボカレ  02_rls.sql
-- Row Level Security を有効化し、ユーザーごとにデータを隔離します。
-- 01_schema.sql の後に実行してください。
-- 各テーブル: 自分の user_id の行だけ select / insert / update / delete 可能。
-- =============================================================

alter table public.equipment          enable row level security;
alter table public.templates          enable row level security;
alter table public.template_steps     enable row level security;
alter table public.experiments        enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_dependencies  enable row level security;
alter table public.todos              enable row level security;

-- ヘルパー: 同じ4ポリシーを各テーブルへ適用 -----------------

-- equipment
drop policy if exists equipment_all on public.equipment;
create policy equipment_all on public.equipment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- templates
drop policy if exists templates_all on public.templates;
create policy templates_all on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- template_steps（親テンプレの所有者に紐づく）
drop policy if exists template_steps_all on public.template_steps;
create policy template_steps_all on public.template_steps
  for all using (
    exists (
      select 1 from public.templates t
      where t.id = template_steps.template_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.templates t
      where t.id = template_steps.template_id and t.user_id = auth.uid()
    )
  );

-- experiments
drop policy if exists experiments_all on public.experiments;
create policy experiments_all on public.experiments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- task_dependencies
drop policy if exists deps_all on public.task_dependencies;
create policy deps_all on public.task_dependencies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- todos
drop policy if exists todos_all on public.todos;
create policy todos_all on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
