-- =============================================================
-- ラボカレ  09_profile.sql
-- プロフィールの表示名とアイコン（絵文字＋背景色）を保存するカラムを
-- user_settings に追加します。
-- 01〜08 の後に実行してください。
-- =============================================================

alter table public.user_settings
  add column if not exists display_name text,
  add column if not exists avatar_emoji text,
  add column if not exists avatar_color text;
