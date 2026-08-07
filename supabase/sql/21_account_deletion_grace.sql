-- =============================================================
-- ラボカレ  21_account_deletion_grace.sql
-- 退会に7日間の猶予を設けます。
--
-- これまでは押した瞬間に完全削除でした。誤操作や気の迷いから戻れるように、
-- 「7日後に削除する予約」に変え、それまでは取り消せるようにします。
--
-- ■ 保存するのは「予定日時」であって「申込日時」ではない
-- deletion_scheduled_at に now() + 7日 を入れます。こうしておくと画面側は
-- 表示するだけで済み、猶予期間の日数をアプリとDBの2箇所に書かずに済みます
-- （2箇所にあると必ず片方だけ変わってズレます）。
--
-- ■ 猶予中もアプリは普通に使えます
-- ログインを塞ぐと「取り消したいのに入れない」になります。代わりに画面へ
-- 予告バナーを出し、そこから取り消せるようにしています。
--
-- ■ 実際に消すのは誰か
-- purge_expired_accounts() を1日1回実行します。スケジュールの登録は
-- 22_schedule_purge.sql（pg_cron）で行います。**22 を実行しないと、予約は
-- されても実際には消えません。** CHECK.sql がそれを検出します。
--
-- 20_delete_own_account.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

-- -------------------------------------------------------------
-- 1) 削除予定日時
-- -------------------------------------------------------------
alter table public.user_settings
  add column if not exists deletion_scheduled_at timestamptz;

-- 期限が来た行を拾う用（件数は少ないが、cron が毎日引くので付けておく）
create index if not exists idx_user_settings_deletion
  on public.user_settings(deletion_scheduled_at)
  where deletion_scheduled_at is not null;

-- -------------------------------------------------------------
-- 2) 退会の予約（本人のみ）
-- -------------------------------------------------------------
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security invoker          -- RLS をそのまま効かせる（自分の行しか触れない）
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  at  timestamptz := now() + interval '7 days';
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into user_settings (user_id, deletion_scheduled_at, updated_at)
  values (uid, at, now())
  on conflict (user_id) do update
    set deletion_scheduled_at = excluded.deletion_scheduled_at,
        updated_at            = now();

  return at;
end;
$$;

-- -------------------------------------------------------------
-- 3) 予約の取り消し（本人のみ）
-- -------------------------------------------------------------
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update user_settings
     set deletion_scheduled_at = null,
         updated_at            = now()
   where user_id = uid;
end;
$$;

-- -------------------------------------------------------------
-- 4) 期限が来たアカウントを実際に削除する（cron から呼ぶ）
--    利用者からは呼べないようにする。他人を消しうる唯一の関数なので、
--    実行できるのは所有者（postgres＝cron の実行主体）だけにする。
-- -------------------------------------------------------------
create or replace function public.purge_expired_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- auth.users を消せば public の各テーブルは on delete cascade で連鎖する
  delete from auth.users u
   where u.id in (
     select s.user_id
       from user_settings s
      where s.deletion_scheduled_at is not null
        and s.deletion_scheduled_at <= now()
   );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- -------------------------------------------------------------
-- 5) 定期ジョブが登録されているかを確かめるための小さな関数。
--
--    CHECK.sql から呼ぶ。cron.job を直接書くと、pg_cron が入っていない
--    データベースでは CHECK.sql 全体が構文解析の時点で落ちてしまうので、
--    動的SQLにして「無ければ false」を返せるようにしている。
--
--    「7日後に消します」と画面で約束している以上、実際に消す仕組みが
--    動いているかどうかは確認できないといけない。
-- -------------------------------------------------------------
create or replace function public.purge_job_scheduled()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if to_regclass('cron.job') is null then
    return false;
  end if;
  execute 'select count(*) from cron.job where jobname = $1 and active'
     into n
    using 'labocale-purge-expired-accounts';
  return coalesce(n, 0) > 0;
exception
  when others then
    -- 権限などで読めない場合も「確認できない＝未登録扱い」にしておく
    return false;
end;
$$;

revoke execute on function public.purge_job_scheduled()      from public, anon, authenticated;
revoke execute on function public.request_account_deletion() from public, anon;
revoke execute on function public.cancel_account_deletion()  from public, anon;
-- 利用者には一切開けない（authenticated にも grant しない）
revoke execute on function public.purge_expired_accounts()   from public, anon, authenticated;

grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion()  to authenticated;

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0021', 'account_deletion_grace')
on conflict (version) do nothing;
