-- =============================================================
-- ラボカレ  20_delete_own_account.sql
-- 利用者が自分でアカウントを削除（退会）できるようにします。
--
-- ■ なぜ service_role キーを使わないか
-- 認証ユーザー（auth.users）の削除は、通常 Supabase の管理APIか service_role
-- キーが必要です。しかし service_role キーは**RLS を全て無視して全ユーザーの
-- データを読み書きできる**ため、アプリのサーバー側に置くと、漏れたときの
-- 被害がデータベース全体に及びます。
--
-- ここでは代わりに security definer の関数を1本だけ用意します。
-- この関数は `where id = auth.uid()` しか書いていないので、
-- **誰が呼んでも自分の行しか消せません。** 影響範囲がこれ以上広がりません。
--
-- ■ 何が消えるか
-- public の全テーブルは auth.users(id) を `on delete cascade` で参照している
-- ので、この1行の delete で連鎖して消えます（実験・予定・依存関係・ToDo・
-- 装置・テンプレート・培地・設定・お問い合わせ・研究室・所属・共有・招待・
-- コメント、および旧 culture_links）。
-- auth スキーマ側（identities / sessions / refresh_tokens など）も
-- Supabase 側の定義で連鎖します。
--
-- ■ 他の利用者への影響（UI 側で警告しています）
-- 研究室の作成者が退会すると、labs が消え、その研究室の所属（lab_members）も
-- 全員分が連鎖で消えます。研究室そのものが無くなります。
--
-- 19_revoke_anon_execute.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 自分の行だけ。ここを条件付きにしないこと（他人を消せる関数になる）。
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0020', 'delete_own_account')
on conflict (version) do nothing;
