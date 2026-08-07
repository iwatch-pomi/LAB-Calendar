-- =============================================================
-- ラボカレ  19_revoke_anon_execute.sql
-- 未ログイン(anon)から RPC を直接呼べる状態を塞ぎます。
--
-- CHECK.sql の「seed_demo_data の実行権」が NG になるのはこれが理由です。
--
-- ■ なぜ今まで塞げていなかったか
-- こちらが書いていたのは `revoke execute on function … from public;` だけでした。
-- ところが Supabase は public スキーマの既定権限として、新しく作られた関数の
-- EXECUTE を anon / authenticated / service_role へ**明示的に**付与します。
-- `from public` は PUBLIC 擬似ロールの分を外すだけなので、anon への明示的な
-- 付与は残ります。実際の ACL は次のようになっていました:
--
--   postgres=X/postgres
--   anon=X/postgres           ← これが残る
--   authenticated=X/postgres
--   service_role=X/postgres
--
-- ■ 今すぐの実害はありません
-- この repo の関数は全て auth.uid() を見ています（null なら例外を投げるか
-- 空集合を返す）。anon では auth.uid() が null なので、読み取りも書き込みも
-- 起きません。それでも塞ぐのは、**今後追加する関数がガードを書き忘れた時点で
-- 本物の穴になる**ためと、赤いままの検査は検査そのものを無意味にするためです。
--
-- ■ 方針: 既定は拒否、必要な分だけ明示的に戻す
-- まずスキーマ単位で全部落とし、そのあと「RLSポリシーの中から呼ばれる関数」
-- だけを anon に戻します。
--
-- ポリシーが呼ぶ関数を anon から落とすと、anon の SELECT が「0件」ではなく
-- **「permission denied for function …」というエラー**に変わります
-- （ポリシーの式が評価できなくなるため）。このアプリは未ログインでDBを引かない
-- ので実害はありませんが、挙動を変えずに surface だけ減らすほうが安全です。
--
-- 戻す7本は全て security definer で、中で auth.uid() で絞り込んでいます。
-- anon から呼んでも必ず空集合が返るので、戻しても情報は漏れません。
--
-- 17_set_features.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

-- 1) いったん全部落とす（列挙漏れを防ぐため、スキーマ単位で）
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

-- 2) RLSポリシーの式から呼ばれる関数だけ戻す。
--    これを戻さないと anon の SELECT がエラーになる（上のコメント参照）。
--    対応するポリシー:
--      shared_owner_ids       … experiments/tasks/deps/todos の _shared_select
--      shared_experiment_ids  … experiments/tasks の _shared_select
--      shared_any_owner_ids   … equipment_shared_select
--      my_lab_ids             … labs_select / lab_members_select / calendar_shares_grantee_select
--      my_managed_lab_ids     … lab_members_manage
--      can_comment_on         … task_comments_insert
--      owns_culture_medium    … culture_media_all
grant execute on function public.shared_owner_ids()        to anon;
grant execute on function public.shared_experiment_ids()   to anon;
grant execute on function public.shared_any_owner_ids()    to anon;
grant execute on function public.my_lab_ids()              to anon;
grant execute on function public.my_managed_lab_ids()      to anon;
grant execute on function public.can_comment_on(uuid)      to anon;
grant execute on function public.owns_culture_medium(uuid) to anon;

-- 3) ログイン済みの権限は 00_baseline.sql / 17 で付けたものを戻す
--    （1 の revoke は PUBLIC と anon にしか効かないので authenticated は無傷だが、
--     将来 revoke の対象を広げたときに備えて明示しておく）
grant execute on function public.seed_demo_data()          to authenticated;
grant execute on function public.set_features(jsonb)       to authenticated;

-- 今後 public に関数を足すときは、そのファイルの中で
--   revoke execute on function public.xxx(...) from public, anon;
--   grant  execute on function public.xxx(...) to authenticated;
-- を必ず書いてください（Supabase の既定権限が anon へ付け直すため）。
-- RLSポリシーの中から呼ぶ関数なら、anon にも grant が要ります。
-- 詳しくは supabase/sql/README.md の規約5。

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0019', 'revoke_anon_execute')
on conflict (version) do nothing;
