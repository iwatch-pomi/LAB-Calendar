-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  15_fix_create_lab.sql
-- 「研究室を作成できませんでした」の修正。
--
-- 原因: create_lab() が参加コードの生成に gen_random_bytes() を使って
-- いました。これは pgcrypto の関数ですが、Supabase では pgcrypto が
-- extensions スキーマに入っている一方、この関数は search_path = public を
-- 固定しているため関数が見つからず、実行時に
--   function gen_random_bytes(integer) does not exist
-- で失敗していました。
--
-- 対策: pgcrypto に依存しない生成方法に変える。gen_random_uuid() は
-- PostgreSQL 13 以降の組み込み関数（pg_catalog）で、search_path に
-- 関係なく必ず解決できます。参加コードの形式（英数8桁）は変わりません。
--
-- 01〜14 の後に実行してください。
-- =============================================================

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
