-- =============================================================
-- ラボカレ  18_backfill_onboarded.sql
-- 17_set_features.sql より前に features が消えてしまったアカウントを直します。
--
-- 症状: 既に使っているのに、ログインするたび「まず研究分野を教えてください」
--       （オンボーディング）と「どちらの使い方をしますか？」（利用形態）が出る。
--
-- 原因は features(jsonb) の丸ごと上書きで onboarded が失われたこと。
-- ここでは「既に実験・予定・ToDo を持っている人は、当然もう使い始めている」
-- とみなして onboarded を立て直します。
-- onboarded が true なら利用形態の確認も出なくなります（lib/role.ts の
-- shouldAskRole が `!roleChosen && !onboarded` のため）。両方まとめて止まります。
--
-- ※ データを1件も持たない人は対象外です。本当の新規ユーザーには
--    オンボーディングが正しく出ます。
--
-- ※ これはデータを変える文なので、規約どおり関数の定義（17）とは別ファイルに
--    しています。`do $$ … $$` の自己ガードは付けていません。下の WHERE 句
--    そのものが冪等（2回目は1行も一致しない）なので、何度実行しても
--    結果は変わりません。
--
-- 17_set_features.sql の後に実行してください。
-- =============================================================

-- 1) データはあるのに user_settings の行が無い人。行ごと作る。
insert into public.user_settings (user_id, features)
select u.user_id, '{"onboarded": true}'::jsonb
  from (
    select user_id from public.experiments
    union
    select user_id from public.tasks
    union
    select user_id from public.todos
  ) u
on conflict (user_id) do nothing;

-- 2) 行はあるが onboarded が失われている人。他のキーは触らずに足す。
update public.user_settings s
   set features   = coalesce(s.features, '{}'::jsonb) || '{"onboarded": true}'::jsonb,
       updated_at = now()
 where coalesce(s.features ->> 'onboarded', '') <> 'true'
   and (
     exists (select 1 from public.experiments e where e.user_id = s.user_id)
     or exists (select 1 from public.tasks t where t.user_id = s.user_id)
     or exists (select 1 from public.todos d where d.user_id = s.user_id)
   );

-- 参考: 直った内容の確認
--   select user_id, role, features from public.user_settings order by updated_at desc;

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0018', 'backfill_onboarded')
on conflict (version) do nothing;
