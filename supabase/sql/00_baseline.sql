-- =============================================================
-- ラボカレ  00_baseline.sql
-- これ1本で、ラボカレのデータベースを「今の完成形」にします。
--
-- ・新規プロジェクト: これだけを実行してください（archive/ の 01〜16 は不要です）
-- ・既存プロジェクト: そのまま実行して構いません。既存データには一切触れません
--   （このファイルにデータを書き換える文は1つもありません）。足りない列や
--   古いポリシーがあれば修復されます。
--
-- 使い方: Supabase ダッシュボード → SQL Editor に全文を貼り付けて Run。
--         そのあと CHECK.sql を貼って、NG が無いことを確認してください。
--
-- 全体を begin; … commit; で囲んでいます。途中でエラーになった場合は
-- 何も変更されません（エラーメッセージを直してから、もう一度全文を流します）。
--
-- 何度実行しても安全です（冪等）。
--
-- 補足: 未受諾の招待(share_invitations)に重複がある古いプロジェクトでは、
-- idx_invitations_pending_uniq の作成でエラーになります。その場合は
-- archive/14_invitation_dedup.sql の先頭にある delete 文だけを先に実行して
-- から、このファイルを流し直してください。
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 0) 拡張
-- -------------------------------------------------------------
-- 拡張（gen_random_uuid 用）
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1) 基本テーブル
-- -------------------------------------------------------------
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

-- -------------------------------------------------------------
-- 2) あとから ALTER で追加された列
--    create table に畳み込まず、追加された順のまま残しています。
--    ・列の並び順が 01〜16 を順に流したDBと一致する
--    ・途中まで移行済みのDBに流したとき、足りない列だけが追加される
-- -------------------------------------------------------------
alter table public.todos
  add column if not exists completed_at timestamptz;

alter table public.experiments
  add column if not exists archived boolean not null default false;

create index if not exists idx_experiments_archived
  on public.experiments(user_id, archived);

-- 1) 予定の種別カラム（培養時間を追加）
alter table public.tasks
  add column if not exists task_kind text not null default 'operation'
  check (task_kind in ('operation','wait','culture'));

-- -------------------------------------------------------------
-- 3) 基本テーブルのインデックス
-- -------------------------------------------------------------
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

-- -------------------------------------------------------------
-- 4) user_settings: 表示設定・プロフィール・利用形態
--    role(学生/教授) は features(jsonb) と分けた専用カラムで持ちます。
--    features は「読んで・混ぜて・書き戻す」ため、別の設定を保存した拍子に
--    役割が巻き込まれて変わりうるからです。
-- -------------------------------------------------------------
create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  features   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists display_name text,
  add column if not exists avatar_emoji text,
  add column if not exists avatar_color text;

-- 1) 専用カラムを追加（既定は学生）
alter table public.user_settings
  add column if not exists role text not null default 'student';

-- 制約は add column とは分けて、存在チェック付きで足します。
-- create table の中に書くと、既にテーブルがあるDBでは丸ごとスキップされて効きません。
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_role_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_role_check
      check (role in ('student', 'teacher'));
  end if;
end $$;

-- -------------------------------------------------------------
-- 5) culture_media: 継代培養（培地）の管理
-- -------------------------------------------------------------
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

create index if not exists idx_culture_media_user   on public.culture_media(user_id);
create index if not exists idx_culture_media_parent on public.culture_media(parent_id);
create index if not exists idx_culture_media_source on public.culture_media(source_task_id);

-- -------------------------------------------------------------
-- 6) feedback: アプリ内のお問い合わせ
-- -------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,                                        -- 送信時のログインメール（返信先把握用）
  category   text not null default 'other'
             check (category in ('improvement','bug','feature','other')),
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_user    on public.feedback(user_id);
create index if not exists idx_feedback_created on public.feedback(created_at desc);

-- -------------------------------------------------------------
-- 7) 共有と研究室
-- -------------------------------------------------------------
create table if not exists public.labs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  invite_code text not null unique,          -- 学生が参加するときの合言葉
  created_at  timestamptz not null default now()
);

create table if not exists public.lab_members (
  id             uuid primary key default gen_random_uuid(),
  lab_id         uuid not null references public.labs(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null default 'student'
                   check (role in ('owner','staff','student')),
  share_calendar boolean not null default true,  -- 学生が自分の予定を研究室に見せるか
  joined_at      timestamptz not null default now(),
  unique (lab_id, user_id)
);

create index if not exists idx_labs_owner        on public.labs(owner_id);
create index if not exists idx_lab_members_lab   on public.lab_members(lab_id);
create index if not exists idx_lab_members_user  on public.lab_members(user_id);

-- 無名の CHECK 制約が3つあります。Postgres は書かれた順に
-- calendar_shares_check / _check1 / _check2 と自動命名するため、
-- 並べ替えると既存DBと制約名がずれます。順序を変えないでください。
create table if not exists public.calendar_shares (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade, -- カレンダーの持ち主
  grantee_user_id uuid references auth.users(id) on delete cascade,          -- 個人あて
  grantee_lab_id  uuid references public.labs(id) on delete cascade,         -- 研究室あて
  scope           text not null default 'all'
                    check (scope in ('all','experiment')),
  experiment_id   uuid references public.experiments(id) on delete cascade,  -- scope='experiment' のとき
  permission      text not null default 'comment'
                    check (permission in ('view','comment')),
  created_at      timestamptz not null default now(),
  -- 個人あて／研究室あてのどちらか一方だけ
  check ((grantee_user_id is not null) <> (grantee_lab_id is not null)),
  -- scope='experiment' のときだけ experiment_id を持つ
  check ((scope = 'experiment') = (experiment_id is not null)),
  -- 自分自身への共有は無意味
  check (grantee_user_id is null or grantee_user_id <> owner_id)
);

-- 同じ相手への重複共有を防ぐ（scope ごとに1件）
create unique index if not exists idx_shares_uniq_user
  on public.calendar_shares(owner_id, grantee_user_id, scope, coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where grantee_user_id is not null;
create unique index if not exists idx_shares_uniq_lab
  on public.calendar_shares(owner_id, grantee_lab_id, scope, coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where grantee_lab_id is not null;

create index if not exists idx_shares_owner   on public.calendar_shares(owner_id);
create index if not exists idx_shares_grantee on public.calendar_shares(grantee_user_id);
create index if not exists idx_shares_lab     on public.calendar_shares(grantee_lab_id);

-- 相手がまだ登録していないときの招待（ログイン時に calendar_shares へ変換）
create table if not exists public.share_invitations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  scope         text not null default 'all'
                  check (scope in ('all','experiment')),
  experiment_id uuid references public.experiments(id) on delete cascade,
  permission    text not null default 'comment'
                  check (permission in ('view','comment')),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_invitations_owner on public.share_invitations(owner_id);
create index if not exists idx_invitations_email on public.share_invitations(lower(email));

-- 未受諾の招待は「相手・範囲」の組み合わせごとに1件だけ
create unique index if not exists idx_invitations_pending_uniq
  on public.share_invitations(
    owner_id,
    lower(email),
    scope,
    coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where accepted_at is null;

-- -------------------------------------------------------------
-- 3) 予定へのコメント
-- -------------------------------------------------------------
create table if not exists public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task   on public.task_comments(task_id, created_at);
create index if not exists idx_task_comments_author on public.task_comments(author_id);

-- -------------------------------------------------------------
-- 8) ポリシーから呼ぶヘルパー関数
--    security definer で RLS をバイパスし、ポリシー同士の相互再帰を防ぎます。
-- -------------------------------------------------------------
-- 自分が所属する研究室
create or replace function public.my_lab_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select lab_id from lab_members where user_id = auth.uid();
$$;

-- 自分が owner/staff として管理している研究室
create or replace function public.my_managed_lab_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select lab_id from lab_members
  where user_id = auth.uid() and role in ('owner','staff');
$$;

-- 「アカウント全体」を自分に見せてくれているユーザー
create or replace function public.shared_owner_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  -- 個人あての全体共有
  select s.owner_id
    from calendar_shares s
   where s.scope = 'all'
     and s.grantee_user_id = auth.uid()
  union
  -- 研究室あての全体共有（自分がその研究室の owner/staff）
  select s.owner_id
    from calendar_shares s
    join lab_members m on m.lab_id = s.grantee_lab_id
   where s.scope = 'all'
     and m.user_id = auth.uid()
     and m.role in ('owner','staff')
  union
  -- 研究室に所属している学生（自分が owner/staff、学生が共有を止めていない）
  select target.user_id
    from lab_members target
    join lab_members viewer on viewer.lab_id = target.lab_id
   where viewer.user_id = auth.uid()
     and viewer.role in ('owner','staff')
     and target.share_calendar
     and target.user_id <> auth.uid();
$$;

-- 個別に共有された実験
create or replace function public.shared_experiment_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.experiment_id
    from calendar_shares s
   where s.scope = 'experiment'
     and s.experiment_id is not null
     and (
       s.grantee_user_id = auth.uid()
       or exists (
         select 1 from lab_members m
          where m.lab_id = s.grantee_lab_id
            and m.user_id = auth.uid()
            and m.role in ('owner','staff')
       )
     );
$$;

-- 何らかの共有を自分にくれているユーザー（装置名の解決に使う）
create or replace function public.shared_any_owner_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.shared_owner_ids()
  union
  select e.user_id from experiments e
   where e.id in (select public.shared_experiment_ids());
$$;

-- そのユーザーのカレンダーにコメントできるか
create or replace function public.can_comment_on(target_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from calendar_shares s
     where s.owner_id = target_owner
       and s.permission = 'comment'
       and (
         s.grantee_user_id = auth.uid()
         or exists (
           select 1 from lab_members m
            where m.lab_id = s.grantee_lab_id
              and m.user_id = auth.uid()
              and m.role in ('owner','staff')
         )
       )
  )
  or exists (
    -- 研究室の教授/スタッフは所属学生にコメントできる
    select 1
      from lab_members target
      join lab_members viewer on viewer.lab_id = target.lab_id
     where target.user_id = target_owner
       and target.share_calendar
       and viewer.user_id = auth.uid()
       and viewer.role in ('owner','staff')
  );
$$;

revoke execute on function public.my_lab_ids()            from public;
revoke execute on function public.my_managed_lab_ids()    from public;
revoke execute on function public.shared_owner_ids()      from public;
revoke execute on function public.shared_experiment_ids() from public;
revoke execute on function public.shared_any_owner_ids()  from public;
revoke execute on function public.can_comment_on(uuid)    from public;

grant execute on function public.my_lab_ids()            to authenticated;
grant execute on function public.my_managed_lab_ids()    to authenticated;
grant execute on function public.shared_owner_ids()      to authenticated;
grant execute on function public.shared_experiment_ids() to authenticated;
grant execute on function public.shared_any_owner_ids()  to authenticated;
grant execute on function public.can_comment_on(uuid)    to authenticated;

-- 培地: 継代元・紐づく培養タスクは自分のものだけ
--
-- 継代元(parent_id)は culture_media 自身を参照するため、ポリシー内から
-- 直接 select すると「infinite recursion detected」で自分の培地に対する
-- 正当な継代登録まで失敗する。security definer 関数に逃がして再帰を切る。
create or replace function public.owns_culture_medium(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from culture_media
     where id = mid and user_id = auth.uid()
  );
$$;

revoke execute on function public.owns_culture_medium(uuid) from public;
grant execute on function public.owns_culture_medium(uuid) to authenticated;

-- -------------------------------------------------------------
-- 9) RLS の有効化（public の全テーブル）
-- -------------------------------------------------------------
alter table public.equipment          enable row level security;
alter table public.templates          enable row level security;
alter table public.template_steps     enable row level security;
alter table public.experiments        enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_dependencies  enable row level security;
alter table public.todos              enable row level security;
alter table public.user_settings      enable row level security;
alter table public.culture_media      enable row level security;
alter table public.feedback           enable row level security;
alter table public.labs               enable row level security;
alter table public.lab_members        enable row level security;
alter table public.calendar_shares    enable row level security;
alter table public.share_invitations  enable row level security;
alter table public.task_comments      enable row level security;

-- -------------------------------------------------------------
-- 10) ポリシー（自分のデータ）
--     tasks / task_dependencies / todos / culture_media の with check は
--     「紐づける先も自分のものか」まで検証する強い版です。共有で他人の行の
--     ID が見えるようになったため、これが無いと他人の行を指す行を作れます。
-- -------------------------------------------------------------
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

drop policy if exists user_settings_all on public.user_settings;
create policy user_settings_all on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists feedback_all on public.feedback;
create policy feedback_all on public.feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 予定: 実験・装置・テンプレステップは自分のものだけ紐付けられる
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      experiment_id is null
      or exists (
        select 1 from public.experiments e
         where e.id = experiment_id and e.user_id = auth.uid()
      )
    )
    and (
      equipment_id is null
      or exists (
        select 1 from public.equipment q
         where q.id = equipment_id and q.user_id = auth.uid()
      )
    )
    and (
      template_step_id is null
      or exists (
        select 1 from public.template_steps s
          join public.templates tp on tp.id = s.template_id
         where s.id = template_step_id and tp.user_id = auth.uid()
      )
    )
  );

-- 依存関係: 前後どちらのタスクも自分のものであること
drop policy if exists deps_all on public.task_dependencies;
create policy deps_all on public.task_dependencies
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
       where t.id = predecessor_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tasks t
       where t.id = successor_id and t.user_id = auth.uid()
    )
  );

-- ToDo: 紐づけるタスクは自分のものだけ
drop policy if exists todos_all on public.todos;
create policy todos_all on public.todos
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
         where t.id = task_id and t.user_id = auth.uid()
      )
    )
  );

drop policy if exists culture_media_all on public.culture_media;
create policy culture_media_all on public.culture_media
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (parent_id is null or public.owns_culture_medium(parent_id))
    and (
      source_task_id is null
      or exists (
        select 1 from public.tasks t
         where t.id = source_task_id and t.user_id = auth.uid()
      )
    )
  );

-- -------------------------------------------------------------
-- 11) ポリシー（共有・研究室）
-- -------------------------------------------------------------
-- 研究室: 所属していれば読める。作成・更新・削除は owner のみ。
drop policy if exists labs_select on public.labs;
create policy labs_select on public.labs
  for select using (
    owner_id = auth.uid() or id in (select public.my_lab_ids())
  );

drop policy if exists labs_write on public.labs;
create policy labs_write on public.labs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 所属: 同じ研究室のメンバーは互いに見える。
drop policy if exists lab_members_select on public.lab_members;
create policy lab_members_select on public.lab_members
  for select using (
    user_id = auth.uid() or lab_id in (select public.my_lab_ids())
  );

-- 自分の所属行は自分で更新（share_calendar のON/OFF）・退会できる。
-- INSERT は意図的に許可しない（lab_id を知っているだけで勝手に参加できてしまうため、
-- 参加は必ず join_lab_by_code() 経由にする）。
drop policy if exists lab_members_self on public.lab_members;
drop policy if exists lab_members_self_update on public.lab_members;
create policy lab_members_self_update on public.lab_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lab_members_self_delete on public.lab_members;
create policy lab_members_self_delete on public.lab_members
  for delete using (user_id = auth.uid());

-- 研究室の管理者はメンバーを追加・変更・削除できる
drop policy if exists lab_members_manage on public.lab_members;
create policy lab_members_manage on public.lab_members
  for all using (lab_id in (select public.my_managed_lab_ids()))
  with check (lab_id in (select public.my_managed_lab_ids()));

-- -------------------------------------------------------------
-- 12) 所属行の列を守るトリガ
-- -------------------------------------------------------------
-- RLS のポリシーは「行」単位でしか制御できず、自分の行の share_calendar を
-- 更新できるということは role も書き換えられてしまう。学生が自分を staff に
-- 昇格させると研究室の全員のカレンダーが見えてしまうため、列の変更を
-- トリガーで塞ぐ（昇格できるのは研究室の管理者のみ）。
create or replace function public.lab_members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from lab_members m
       where m.lab_id = old.lab_id
         and m.user_id = auth.uid()
         and m.role in ('owner','staff')
    ) then
      raise exception 'only lab managers can change roles';
    end if;
  end if;
  if new.lab_id is distinct from old.lab_id
     or new.user_id is distinct from old.user_id then
    raise exception 'cannot move a membership to another lab or user';
  end if;
  return new;
end;
$$;

drop trigger if exists lab_members_guard_trg on public.lab_members;
create trigger lab_members_guard_trg
  before update on public.lab_members
  for each row execute function public.lab_members_guard();

-- -------------------------------------------------------------
-- 13) ポリシー（共有・招待・コメント）
-- -------------------------------------------------------------
-- 共有: 持ち主が作成・削除。共有された側も自分あての行を読める。
drop policy if exists calendar_shares_owner on public.calendar_shares;
create policy calendar_shares_owner on public.calendar_shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists calendar_shares_grantee_select on public.calendar_shares;
create policy calendar_shares_grantee_select on public.calendar_shares
  for select using (
    grantee_user_id = auth.uid()
    or grantee_lab_id in (select public.my_lab_ids())
  );

-- 招待: 送った本人だけが見える（受け取り側は RPC 経由で変換する）
drop policy if exists share_invitations_owner on public.share_invitations;
create policy share_invitations_owner on public.share_invitations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- コメント: 対象タスクを読める人は読める。書けるのはコメント権限がある人だけ。
-- ここは「tasks 側の RLS が入れ子でも効くはず」に依存させず、
-- 可視条件を明示的に書く（依存すると全コメントが読めてしまう危険がある）。
drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments
  for select using (
    exists (
      select 1 from public.tasks t
       where t.id = task_id
         and (
           t.user_id = auth.uid()
           or t.user_id in (select public.shared_owner_ids())
           or t.experiment_id in (select public.shared_experiment_ids())
         )
    )
  );

drop policy if exists task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
       where t.id = task_id
         and (t.user_id = auth.uid() or public.can_comment_on(t.user_id))
    )
  );

drop policy if exists task_comments_modify on public.task_comments;
create policy task_comments_modify on public.task_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments
  for delete using (author_id = auth.uid());

-- -------------------------------------------------------------
-- 14) ポリシー（共有された分だけ読める）
-- -------------------------------------------------------------
-- -------------------------------------------------------------
-- 6) 既存テーブルへ「共有された分だけ読める」ポリシーを追加
--    既存の <table>_all はそのまま。許可ポリシーは OR されるので、
--    自分のデータへのフルアクセスは一切変わりません。
--    集合を返す関数を in (select ...) で使うことで、
--    行ごとではなくクエリ全体で1回だけ評価されます。
-- -------------------------------------------------------------
drop policy if exists experiments_shared_select on public.experiments;
create policy experiments_shared_select on public.experiments
  for select using (
    user_id in (select public.shared_owner_ids())
    or id in (select public.shared_experiment_ids())
  );

drop policy if exists tasks_shared_select on public.tasks;
create policy tasks_shared_select on public.tasks
  for select using (
    user_id in (select public.shared_owner_ids())
    or experiment_id in (select public.shared_experiment_ids())
  );

drop policy if exists deps_shared_select on public.task_dependencies;
create policy deps_shared_select on public.task_dependencies
  for select using (
    user_id in (select public.shared_owner_ids())
  );

-- ToDo は実験に紐づかないので「全体共有」のときだけ
drop policy if exists todos_shared_select on public.todos;
create policy todos_shared_select on public.todos
  for select using (
    user_id in (select public.shared_owner_ids())
  );

-- 装置は予定のバッジ表示（「遠心機予約」など）に必要。
-- 何らかの共有をくれている相手のものだけ、名前を読めるようにする。
drop policy if exists equipment_shared_select on public.equipment;
create policy equipment_shared_select on public.equipment
  for select using (
    user_id in (select public.shared_any_owner_ids())
  );

-- ※ templates / template_steps / culture_media / user_settings / feedback は
--   共有しません（閲覧専用の進捗ビューに不要なため）。
--   共有ビューは「閲覧者自身の」表示設定（週の開始曜日など）で描画します。

-- -------------------------------------------------------------
-- 15) RPC: 共有・研究室
-- -------------------------------------------------------------
create or replace function public.share_calendar_by_email(
  target_email  text,
  p_scope       text default 'all',
  p_experiment  uuid default null,
  p_permission  text default 'comment'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_scope not in ('all','experiment') then
    raise exception 'invalid scope';
  end if;
  if p_permission not in ('view','comment') then
    raise exception 'invalid permission';
  end if;
  if (p_scope = 'experiment') <> (p_experiment is not null) then
    raise exception 'experiment_id is required for scope=experiment';
  end if;
  -- 自分の実験でなければ拒否
  if p_experiment is not null and not exists (
    select 1 from experiments where id = p_experiment and user_id = uid
  ) then
    raise exception 'experiment not found';
  end if;

  select id into target from auth.users
   where lower(email) = lower(trim(target_email))
   limit 1;

  if target is null then
    -- 同じ相手・同じ範囲の未受諾の招待が既にあれば増やさない。
    -- 権限だけ変えたい場合もあるので、既存行の permission は更新する。
    insert into share_invitations(owner_id, email, scope, experiment_id, permission)
    values (uid, lower(trim(target_email)), p_scope, p_experiment, p_permission)
    on conflict (owner_id, lower(email), scope,
                 coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid))
      where accepted_at is null
      do update set permission = excluded.permission;
    return 'invited';
  end if;

  if target = uid then
    raise exception 'cannot share with yourself';
  end if;

  insert into calendar_shares(owner_id, grantee_user_id, scope, experiment_id, permission)
  values (uid, target, p_scope, p_experiment, p_permission)
  on conflict do nothing;
  return 'shared';
end;
$$;

revoke execute on function public.share_calendar_by_email(text, text, uuid, text) from public;
grant execute on function public.share_calendar_by_email(text, text, uuid, text) to authenticated;

-- ログイン後に呼ぶ。自分のメール宛の招待を実際の共有へ変換する。
create or replace function public.claim_share_invitations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  mail  text;
  n     int  := 0;
begin
  if uid is null then
    return 0;
  end if;
  select lower(email) into mail from auth.users where id = uid;
  if mail is null then
    return 0;
  end if;

  insert into calendar_shares(owner_id, grantee_user_id, scope, experiment_id, permission)
  select i.owner_id, uid, i.scope, i.experiment_id, i.permission
    from share_invitations i
   where lower(i.email) = mail
     and i.accepted_at is null
     and i.owner_id <> uid
  on conflict do nothing;

  get diagnostics n = row_count;

  update share_invitations
     set accepted_at = now()
   where lower(email) = mail and accepted_at is null;

  return n;
end;
$$;

create or replace function public.create_lab(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  lid  uuid;
  code text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required';
  end if;

  -- 衝突しない参加コードを引く。
  -- gen_random_uuid() は組み込みなので pgcrypto の場所に左右されない。
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from labs where invite_code = code);
  end loop;

  insert into labs(owner_id, name, invite_code)
  values (uid, trim(p_name), code)
  returning id into lid;

  insert into lab_members(lab_id, user_id, role)
  values (lid, uid, 'owner');

  return lid;
end;
$$;

revoke execute on function public.create_lab(text) from public;
grant execute on function public.create_lab(text) to authenticated;

-- 参加コードで研究室に参加する（全 labs を読ませずに済ませるため RPC 経由）
create or replace function public.join_lab_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select id into lid from labs where invite_code = trim(code) limit 1;
  if lid is null then
    raise exception 'lab not found';
  end if;
  insert into lab_members(lab_id, user_id, role)
  values (lid, uid, 'student')
  on conflict (lab_id, user_id) do nothing;
  return lid;
end;
$$;

revoke execute on function public.claim_share_invitations() from public;
revoke execute on function public.join_lab_by_code(text) from public;

grant execute on function public.claim_share_invitations() to authenticated;
grant execute on function public.join_lab_by_code(text) to authenticated;

-- -------------------------------------------------------------
-- 16) RPC: 共有相手の表示名
-- -------------------------------------------------------------
create or replace function public.visible_profiles()
returns table (
  user_id      uuid,
  email        text,
  display_name text,
  avatar_emoji text,
  avatar_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, s.display_name, s.avatar_emoji, s.avatar_color
    from auth.users u
    left join user_settings s on s.user_id = u.id
   where u.id = auth.uid()
      or u.id in (select public.shared_owner_ids())
      or u.id in (
        -- 同じ研究室のメンバー
        select m.user_id from lab_members m
         where m.lab_id in (select public.my_lab_ids())
      )
      or u.id in (
        -- 自分が共有した相手（「共有中」一覧の表示用）
        select c.grantee_user_id from calendar_shares c
         where c.owner_id = auth.uid()
           and c.grantee_user_id is not null
      );
$$;

revoke execute on function public.visible_profiles() from public;
grant execute on function public.visible_profiles() to authenticated;

-- -------------------------------------------------------------
-- 17) RPC: 初回ログイン時のデモデータ投入
-- -------------------------------------------------------------
create or replace function public.seed_demo_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz  text := 'Asia/Tokyo';
  monday date;
  -- 装置
  eq_centrifuge uuid;
  eq_akta uuid;
  -- テンプレ
  tpl_ecoli uuid;
  tpl_plasmid uuid;
  tpl_sds uuid;
  -- 実験
  exp_ecoli uuid;
  exp_plasmid uuid;
  -- タスク
  t_pre uuid; t_main uuid; t_wait uuid; t_iptg uuid;
  t_harvest uuid; t_sonic uuid; t_ninta uuid; t_sds uuid; t_result uuid;
  t_mini uuid; t_restrict uuid; t_agarose uuid; t_confirm uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 既にデータがあれば何もしない（二重投入防止）
  if exists (select 1 from experiments where user_id = uid) then
    return;
  end if;

  monday := (date_trunc('week', (now() at time zone tz)))::date;

  -- 日付＋時刻から timestamptz を作るローカル式:
  --   ((monday + d)::timestamp + make_interval(hours=>h, mins=>mi)) at time zone tz

  ---------------------------------------------------------------
  -- 装置
  ---------------------------------------------------------------
  insert into equipment(user_id, name, color) values (uid, '遠心機', 'sky')
    returning id into eq_centrifuge;
  insert into equipment(user_id, name, color) values (uid, 'AKTA', 'violet')
    returning id into eq_akta;

  ---------------------------------------------------------------
  -- テンプレート（実験を追加メニュー用）
  ---------------------------------------------------------------
  -- 大腸菌タンパク質発現（全6ステップ・約4日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, '大腸菌タンパク質発現', '全6ステップ・約4日・遠心機/AKTA', '約4日', 6, 'teal')
    returning id into tpl_ecoli;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_ecoli, 1, '前培養（LB液体）', null,        0, 90,  810, null,   false),
    (tpl_ecoli, 2, '本培養 開始',       null,        0, 60,  0,   null,   false),
    (tpl_ecoli, 3, '培養待機',          '37℃ / 6h',  0, 360, 0,   null,   false),
    (tpl_ecoli, 4, 'IPTG誘導',          null,        0, 30,  990, null,   false),
    (tpl_ecoli, 5, '菌体回収・遠心',    null,        0, 120, 0,   '遠心機', true),
    (tpl_ecoli, 6, 'Ni-NTA 精製',       null,        0, 180, 0,   'AKTA', true);

  -- プラスミド抽出＋制限酵素（全4ステップ・約1日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, 'プラスミド抽出＋制限酵素', '全4ステップ・約1日', '約1日', 4, 'violet')
    returning id into tpl_plasmid;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_plasmid, 1, 'ミニプレップ',       null, 0, 60, 0,  null, false),
    (tpl_plasmid, 2, '制限酵素処理',       '37℃', 0, 90, 60, null, false),
    (tpl_plasmid, 3, 'アガロース電気泳動', null, 0, 60, 0,  null, false),
    (tpl_plasmid, 4, '精製・確認',         null, 0, 60, 0,  null, false);

  -- SDS-PAGE 電気泳動（全3ステップ・半日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, 'SDS-PAGE 電気泳動', '全3ステップ・半日', '半日', 3, 'sky')
    returning id into tpl_sds;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_sds, 1, 'サンプル調製', null, 0, 30,  0,  null, false),
    (tpl_sds, 2, '電気泳動',     null, 0, 90,  0,  null, false),
    (tpl_sds, 3, '染色・脱色',   null, 0, 120, 30, null, false);

  ---------------------------------------------------------------
  -- 実験 1: 大腸菌タンパク質発現（進行中・ステップ2/6）
  ---------------------------------------------------------------
  insert into experiments(user_id, template_id, name, status, current_step, total_steps, color)
    values (uid, tpl_ecoli, '大腸菌タンパク質発現', 'in_progress', 2, 6, 'teal')
    returning id into exp_ecoli;

  -- タスク（曜日: 月=0, 火=1, 水=2, 木=3, 金=4）
  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '前培養（LB液体）', null,
      ((monday + 0)::timestamp + make_interval(hours=>18, mins=>0))  at time zone tz,
      ((monday + 0)::timestamp + make_interval(hours=>19, mins=>30)) at time zone tz,
      'done', null, false, false) returning id into t_pre;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '本培養 開始', null,
      ((monday + 1)::timestamp + make_interval(hours=>9))  at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz,
      'done', null, false, false) returning id into t_main;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '培養待機', '37℃ / 6h',
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>16)) at time zone tz,
      'planned', null, false, true) returning id into t_wait;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'IPTG誘導', null,
      ((monday + 1)::timestamp + make_interval(hours=>16, mins=>0))  at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>16, mins=>30)) at time zone tz,
      'planned', null, false, false) returning id into t_iptg;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '菌体回収・遠心', null,
      ((monday + 2)::timestamp + make_interval(hours=>9))  at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>11)) at time zone tz,
      'planned', eq_centrifuge, true, false) returning id into t_harvest;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '超音波破砕', null,
      ((monday + 2)::timestamp + make_interval(hours=>11)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>12)) at time zone tz,
      'planned', null, false, false) returning id into t_sonic;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'Ni-NTA 精製', null,
      ((monday + 3)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 3)::timestamp + make_interval(hours=>13)) at time zone tz,
      'planned', eq_akta, true, false) returning id into t_ninta;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'SDS-PAGE 確認', null,
      ((monday + 3)::timestamp + make_interval(hours=>14)) at time zone tz,
      ((monday + 3)::timestamp + make_interval(hours=>17)) at time zone tz,
      'planned', null, false, false) returning id into t_sds;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '結果まとめ', null,
      ((monday + 4)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 4)::timestamp + make_interval(hours=>12)) at time zone tz,
      'planned', null, false, false) returning id into t_result;

  -- 依存関係チェーン（gap_minutes は培養/誘導などの待ち時間）
  insert into task_dependencies(user_id, predecessor_id, successor_id, gap_minutes) values
    (uid, t_pre,     t_main,    810),  -- 前培養→本培養（一晩）
    (uid, t_main,    t_wait,    0),
    (uid, t_wait,    t_iptg,    0),
    (uid, t_iptg,    t_harvest, 990),  -- IPTG誘導→回収（一晩発現）
    (uid, t_harvest, t_sonic,   0),
    (uid, t_sonic,   t_ninta,   0),
    (uid, t_ninta,   t_sds,     0),
    (uid, t_sds,     t_result,  0);

  ---------------------------------------------------------------
  -- 実験 2: プラスミド抽出＋制限酵素（未着手・全4ステップ）
  ---------------------------------------------------------------
  insert into experiments(user_id, template_id, name, status, current_step, total_steps, color)
    values (uid, tpl_plasmid, 'プラスミド抽出＋制限酵素', 'planning', 0, 4, 'violet')
    returning id into exp_plasmid;

  -- タスク（水曜午後。大腸菌実験と装置・時間帯が重ならない枠）
  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_plasmid, 'ミニプレップ', null,
      ((monday + 2)::timestamp + make_interval(hours=>13)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>14)) at time zone tz,
      'planned', null, false, false) returning id into t_mini;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_plasmid, '制限酵素処理', '37℃',
      ((monday + 2)::timestamp + make_interval(hours=>14)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>15, mins=>30)) at time zone tz,
      'planned', null, false, false) returning id into t_restrict;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_plasmid, 'アガロース電気泳動', null,
      ((monday + 2)::timestamp + make_interval(hours=>16, mins=>30)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>17, mins=>30)) at time zone tz,
      'planned', null, false, false) returning id into t_agarose;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_plasmid, '精製・確認', null,
      ((monday + 2)::timestamp + make_interval(hours=>17, mins=>30)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>18, mins=>30)) at time zone tz,
      'planned', null, false, false) returning id into t_confirm;

  insert into task_dependencies(user_id, predecessor_id, successor_id, gap_minutes) values
    (uid, t_mini,     t_restrict, 0),
    (uid, t_restrict, t_agarose,  60),  -- 制限酵素処理→泳動（反応時間）
    (uid, t_agarose,  t_confirm,  0);

  ---------------------------------------------------------------
  -- 今日の ToDo
  ---------------------------------------------------------------
  insert into todos(user_id, title, due_at, done, sort_order) values
    (uid, 'LB培地＋アンピシリンの準備', null, true, 0),
    (uid, '本培養の吸光度（OD600）を測定',
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz, false, 1),
    (uid, '遠心機（水 9:00）の予約を確定',
      ((monday + 2)::timestamp + make_interval(hours=>9)) at time zone tz, false, 2),
    (uid, 'SDS-PAGE 用ゲルの発注', null, false, 3);

end;
$$;

revoke execute on function public.seed_demo_data() from public;
grant execute on function public.seed_demo_data() to authenticated;

-- -------------------------------------------------------------
-- 18) 移行台帳
--     どこまで適用済みかをDB自身に記録します。CHECK.sql がこれを読みます。
-- -------------------------------------------------------------
create table if not exists public.schema_migrations (
  version    text primary key,
  name       text not null,
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);

comment on table public.schema_migrations is
  'どのSQLファイルまで適用したかの記録。「到達したスキーマの状態」を表すもので、'
  '過去のデータ移行(update/delete)を実行したかどうかではありません。'
  '新規DBに 00_baseline.sql を流すと 0000〜0016 が一度に記録されます。';

-- 運用者（＝SQLエディター）はテーブル所有者なので RLS を迂回できます。
-- アプリ側からは一切読ませません。RLS 有効＋ポリシー0件で全行を隠したうえで、
-- revoke でテーブル自体の権限も落とします（RLS だけだと PostgREST の API 面に
-- 残って列名が漏れ、revoke だけだと既定権限で後から再付与されうるため両方）。
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from anon, authenticated;

insert into public.schema_migrations(version, name) values
  ('0000', 'baseline'),
  ('0001', 'schema'),
  ('0002', 'rls'),
  ('0003', 'seed_function'),
  ('0004', 'user_settings'),
  ('0005', 'culture_links'),
  ('0006', 'todos_completed_at'),
  ('0007', 'experiments_archived'),
  ('0008', 'culture_media'),
  ('0009', 'profile'),
  ('0010', 'feedback'),
  ('0011', 'sharing'),
  ('0012', 'share_rls_hardening'),
  ('0013', 'shared_profiles'),
  ('0014', 'invitation_dedup'),
  ('0015', 'fix_create_lab'),
  ('0016', 'user_role')
on conflict (version) do nothing;

commit;
