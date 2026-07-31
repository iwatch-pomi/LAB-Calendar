-- =============================================================
-- ラボカレ  13_shared_profiles.sql
-- 共有相手・研究室メンバーの「名前」を表示するための RPC。
--
-- 11_sharing.sql では user_settings を共有対象から外したため、
-- 教授がメンバー一覧を出しても user_id しか分からない状態でした。
-- かといって user_settings ごと共有すると features（実験モードの設定）まで
-- 見えてしまうので、必要な列だけ返す security definer 関数を用意します。
--
-- 返す範囲は次の4つに限定します:
--   ・自分自身
--   ・自分にカレンダーを共有してくれている人
--   ・自分が所属する研究室のメンバー
--   ・自分がカレンダーを共有した相手
--
-- 01〜12 の後に実行してください。
-- =============================================================

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
