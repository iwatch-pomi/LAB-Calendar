-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  11_sharing.sql
-- カレンダーの共有（教授・先輩・共同研究者への進捗報告）と、
-- 教授が複数の学生をまとめて見る「研究室」を追加します。
--
-- ・labs / lab_members: 研究室と所属（参加コードで学生が参加）
-- ・calendar_shares:    共有（アカウント全体 or 特定の実験 / 閲覧 or コメント）
-- ・share_invitations:  相手が未登録のときのメール招待
-- ・task_comments:      予定へのコメント
--
-- 既存テーブルは一切変更しません。所有者は今まで通り user_id のままで、
-- 「誰が読めるか」だけを for select の許可ポリシーで足します
-- （Postgres は許可ポリシーを OR で結合するため既存の for all は無傷）。
--
-- 01〜10 の後に実行してください。
-- =============================================================

-- -------------------------------------------------------------
-- 1) 研究室
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

-- -------------------------------------------------------------
-- 2) 共有
-- -------------------------------------------------------------
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
-- 4) ヘルパー関数（security definer で RLS をバイパスし再帰を防ぐ）
--    ポリシー内から calendar_shares / lab_members を直接引くと、
--    それら自身の RLS と相互再帰するため必ずこの関数を経由します。
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

-- -------------------------------------------------------------
-- 5) 新規テーブルの RLS
-- -------------------------------------------------------------
alter table public.labs              enable row level security;
alter table public.lab_members       enable row level security;
alter table public.calendar_shares   enable row level security;
alter table public.share_invitations enable row level security;
alter table public.task_comments     enable row level security;

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
-- 7) アカウント連携用の RPC
--    auth.users はクライアントから引けないため security definer で包みます。
-- -------------------------------------------------------------

-- メールアドレスを指定して共有する。
-- 相手が登録済みなら共有を作成し、未登録なら招待として積む。
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
    insert into share_invitations(owner_id, email, scope, experiment_id, permission)
    values (uid, lower(trim(target_email)), p_scope, p_experiment, p_permission);
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

-- 研究室を作成し、作成者を owner として所属させる。
-- 作成直後はまだ管理者ではないため lab_members へ直接 INSERT できない
-- （鶏と卵）。両方を1つの関数の中で行う。
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

  -- 衝突しない参加コードを引く
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
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

revoke execute on function public.share_calendar_by_email(text, text, uuid, text) from public;
revoke execute on function public.claim_share_invitations() from public;
revoke execute on function public.create_lab(text) from public;
revoke execute on function public.join_lab_by_code(text) from public;

grant execute on function public.share_calendar_by_email(text, text, uuid, text) to authenticated;
grant execute on function public.claim_share_invitations() to authenticated;
grant execute on function public.create_lab(text) to authenticated;
grant execute on function public.join_lab_by_code(text) to authenticated;
