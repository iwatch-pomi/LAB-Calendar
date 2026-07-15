-- =============================================================
-- ラボカレ  01_schema.sql
-- Supabase SQL エディターに貼り付けて実行してください（最初に実行）。
-- テーブル・インデックス・updated 用トリガを作成します。
-- =============================================================

-- 拡張（gen_random_uuid 用）
create extension if not exists pgcrypto;

-- ---------- equipment: 共通装置（ユーザーごと管理） ----------
create table if not exists public.equipment (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default 'slate',
  created_at timestamptz not null default now()
);

-- ---------- templates: 実験テンプレート ----------
create table if not exists public.templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  estimated_label text,                 -- 例: 約4日
  total_steps     int  not null default 0,
  color           text not null default 'teal',
  created_at      timestamptz not null default now()
);

-- ---------- template_steps: テンプレ内ステップ ----------
create table if not exists public.template_steps (
  id                       uuid primary key default gen_random_uuid(),
  template_id              uuid not null references public.templates(id) on delete cascade,
  step_order               int  not null,
  title                    text not null,
  subtitle                 text,
  offset_from_prev_minutes int  not null default 0,   -- 直前ステップ終了からの開始オフセット
  duration_minutes         int  not null default 60,
  wait_after_minutes       int  not null default 0,   -- 培養/計算などの待ち（次ステップまでの gap）
  equipment_name           text,                       -- 装置名（ユーザーの equipment と名寄せ）
  needs_reservation        boolean not null default false
);

-- ---------- experiments: 実体化した実験 ----------
create table if not exists public.experiments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  name        text not null,
  status      text not null default 'planning'
                check (status in ('planning','in_progress','done','failed')),
  current_step int not null default 0,
  total_steps  int not null default 0,
  color        text not null default 'teal',
  created_at   timestamptz not null default now()
);

-- ---------- tasks: カレンダー上のブロック ----------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  experiment_id    uuid references public.experiments(id) on delete cascade,
  title            text not null,
  subtitle         text,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  status           text not null default 'planned'
                     check (status in ('planned','done','failed')),
  equipment_id     uuid references public.equipment(id) on delete set null,
  needs_reservation boolean not null default false,
  is_wait          boolean not null default false,   -- 培養/待機ブロック
  template_step_id uuid references public.template_steps(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ---------- task_dependencies: 依存関係 DAG ----------
create table if not exists public.task_dependencies (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  predecessor_id uuid not null references public.tasks(id) on delete cascade,
  successor_id   uuid not null references public.tasks(id) on delete cascade,
  gap_minutes    int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (predecessor_id, successor_id),
  check (predecessor_id <> successor_id)
);

-- ---------- todos: 今日の ToDo ----------
create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  due_at     timestamptz,
  done       boolean not null default false,
  task_id    uuid references public.tasks(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- インデックス ----------
create index if not exists idx_equipment_user       on public.equipment(user_id);
create index if not exists idx_templates_user        on public.templates(user_id);
create index if not exists idx_template_steps_tpl    on public.template_steps(template_id, step_order);
create index if not exists idx_experiments_user      on public.experiments(user_id);
create index if not exists idx_tasks_user_start      on public.tasks(user_id, start_time);
create index if not exists idx_tasks_experiment      on public.tasks(experiment_id);
create index if not exists idx_tasks_equipment       on public.tasks(equipment_id, start_time);
create index if not exists idx_deps_user             on public.task_dependencies(user_id);
create index if not exists idx_deps_pred             on public.task_dependencies(predecessor_id);
create index if not exists idx_deps_succ             on public.task_dependencies(successor_id);
create index if not exists idx_todos_user            on public.todos(user_id, sort_order);
