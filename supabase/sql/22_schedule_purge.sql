-- =============================================================
-- ラボカレ  22_schedule_purge.sql
-- 退会の予約を実際に実行する定期ジョブを登録します。
--
-- ⚠️ **このファイルを実行しないと、退会予約は取られても実際には削除されません。**
--    「7日後に消します」と画面で約束しているので、必ず実行してください。
--    実行し忘れは CHECK.sql が NG として検出します。
--
-- ■ なぜ pg_cron か
-- Vercel の Cron からAPI経由で叩く方法もありますが、その場合は削除の権限を
-- 持つ鍵（service_role キー）をアプリ側に置くことになります。あの鍵は RLS を
-- 全て無視して全ユーザーのデータを読み書きできるため、置きたくありません。
-- pg_cron ならデータベースの中で完結し、鍵をどこにも置かずに済みます。
--
-- ■ 先に拡張を有効にしてください
-- Supabase ダッシュボード → Database → Extensions で **pg_cron** を探して
-- 有効化してから、このファイルを実行してください。
-- 下の create extension でも有効化を試みますが、権限の都合でダッシュボード
-- からでないと有効にできない場合があります。
--
-- ■ 自動実行を使わない場合
-- SQL Editor で次を実行すれば、その場で期限切れのアカウントを削除できます。
--   select public.purge_expired_accounts();
-- ただし手動運用にすると実行忘れがそのまま「消えていない」になるので、
-- 自動実行を強くおすすめします。
--
-- 21_account_deletion_grace.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

create extension if not exists pg_cron;

-- 毎日 18:00 UTC（日本時間の翌 3:00）に実行する。
-- cron.schedule はジョブ名が同じなら上書きするので、何度実行しても増えない。
select cron.schedule(
  'labocale-purge-expired-accounts',
  '0 18 * * *',
  $job$select public.purge_expired_accounts()$job$
);

-- 参考:
--   登録の確認   select jobname, schedule, active from cron.job;
--   実行履歴     select * from cron.job_run_details order by start_time desc limit 10;
--   解除         select cron.unschedule('labocale-purge-expired-accounts');

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0022', 'schedule_purge')
on conflict (version) do nothing;
