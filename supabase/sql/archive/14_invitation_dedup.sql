-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  14_invitation_dedup.sql
-- 未登録の相手への「招待」が重複しないようにします。
--
-- これまで share_calendar_by_email は share_invitations へ素の insert を
-- していたため、同じ相手に2回共有を押すと同じ招待が2行できていました。
-- /shared に「招待中」の一覧を出すようにしたことで、この重複が
-- そのまま画面に並んでしまうため、DB側で防ぎます。
--
-- ・未受諾（accepted_at is null）のときだけ効く部分ユニークインデックス
-- ・share_calendar_by_email を on conflict do nothing に更新
--   （関数のそれ以外の挙動は 11_sharing.sql から変えていません）
--
-- 01〜13 の後に実行してください。
-- =============================================================

-- 既に重複が入っている場合は、最初の1件だけ残して掃除する
-- （インデックスを張る前に必要）
delete from public.share_invitations a
 using public.share_invitations b
 where a.accepted_at is null
   and b.accepted_at is null
   and a.owner_id = b.owner_id
   and lower(a.email) = lower(b.email)
   and a.scope = b.scope
   and a.experiment_id is not distinct from b.experiment_id
   and a.ctid > b.ctid;

-- 未受諾の招待は「相手・範囲」の組み合わせごとに1件だけ
create unique index if not exists idx_invitations_pending_uniq
  on public.share_invitations(
    owner_id,
    lower(email),
    scope,
    coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where accepted_at is null;

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
