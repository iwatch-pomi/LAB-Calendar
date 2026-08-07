-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  16_user_role.sql
-- 利用形態（学生 / 教授・指導者）を専用カラムに分離する。
--
-- これまで features(jsonb) の中に is_teacher として、テーマや実験モードと
-- 同居させていました。features は「読んで・混ぜて・書き戻す」形で更新するため、
-- 別の設定を保存した拍子に役割が巻き込まれて変わりうる構造でした。
-- 役割はログイン後の行き先（学生カレンダー / 教授の管理画面）を決める
-- 土台なので、他の設定から完全に切り離した専用カラムで持ちます。
--
-- 04_user_settings.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

-- 1) 専用カラムを追加（既定は学生）
alter table public.user_settings
  add column if not exists role text not null default 'student';

-- 2) 値を 'student' / 'teacher' に限定する
--    （制約は add column と分けて書く。既存行の移行より後だと弾かれるため、
--     移行の前に入れておく。既定値が 'student' なので既存行も通る）
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

-- 3) 既存の features.is_teacher から移行する
update public.user_settings
set role = 'teacher'
where features ->> 'is_teacher' = 'true'
  and role <> 'teacher';

-- 4) 役割は専用カラムで持つので features 側からは取り除く
--    （両方に残すと、どちらが正か分からなくなる）
update public.user_settings
set features = features - 'is_teacher'
where features ? 'is_teacher';

-- 参考: 移行結果の確認
--   select user_id, role, features from public.user_settings;
