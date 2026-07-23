-- =============================================================
-- ラボカレ  10_feedback.sql
-- アプリ内のお問い合わせ / フィードバックを保存するテーブル。
-- ユーザーが改善要望・不具合報告・新機能リクエストなどを送信します。
-- 開発者は Supabase ダッシュボード（Table Editor / SQL エディター）で
-- 全件を確認します（service_role は RLS をバイパスします）。
-- 01〜09 の後に実行してください。
-- =============================================================

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,                                        -- 送信時のログインメール（返信先把握用）
  category   text not null default 'other'
             check (category in ('improvement','bug','feature','other')),
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists feedback_all on public.feedback;
create policy feedback_all on public.feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_feedback_user    on public.feedback(user_id);
create index if not exists idx_feedback_created on public.feedback(created_at desc);
