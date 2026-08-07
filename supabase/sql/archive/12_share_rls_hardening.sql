-- ⚠ 実行しないでください。これは履歴です。現行版は supabase/sql/00_baseline.sql（理由は archive/README.md）
-- =============================================================
-- ラボカレ  12_share_rls_hardening.sql
-- 11_sharing.sql で「他人の行が SELECT できる」ようになったことに伴う
-- 書き込み側の穴を塞ぎます。
--
-- これまで tasks / task_dependencies / todos / culture_media の外部キーは
-- 「参照先が自分のものか」を検証していませんでした。他人の行が見えない
-- あいだは実害がありませんでしたが、共有で ID が見えるようになると
-- 他人の行を参照する行を作れてしまいます（例: 他人のタスクを指す依存関係）。
--
-- 既存ポリシーの using（読み取り条件）は変更せず、
-- with check（書き込み条件）だけを厳しくします。
--
-- 01〜11 の後に実行してください。
-- =============================================================

-- 予定: 実験・装置・テンプレステップは自分のものだけ紐付けられる
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      experiment_id is null
      or exists (
        select 1 from public.experiments e
         where e.id = experiment_id and e.user_id = auth.uid()
      )
    )
    and (
      equipment_id is null
      or exists (
        select 1 from public.equipment q
         where q.id = equipment_id and q.user_id = auth.uid()
      )
    )
    and (
      template_step_id is null
      or exists (
        select 1 from public.template_steps s
          join public.templates tp on tp.id = s.template_id
         where s.id = template_step_id and tp.user_id = auth.uid()
      )
    )
  );

-- 依存関係: 前後どちらのタスクも自分のものであること
drop policy if exists deps_all on public.task_dependencies;
create policy deps_all on public.task_dependencies
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
       where t.id = predecessor_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tasks t
       where t.id = successor_id and t.user_id = auth.uid()
    )
  );

-- ToDo: 紐づけるタスクは自分のものだけ
drop policy if exists todos_all on public.todos;
create policy todos_all on public.todos
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
         where t.id = task_id and t.user_id = auth.uid()
      )
    )
  );

-- 培地: 継代元・紐づく培養タスクは自分のものだけ
--
-- 継代元(parent_id)は culture_media 自身を参照するため、ポリシー内から
-- 直接 select すると「infinite recursion detected」で自分の培地に対する
-- 正当な継代登録まで失敗する。security definer 関数に逃がして再帰を切る。
create or replace function public.owns_culture_medium(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from culture_media
     where id = mid and user_id = auth.uid()
  );
$$;

revoke execute on function public.owns_culture_medium(uuid) from public;
grant execute on function public.owns_culture_medium(uuid) to authenticated;

drop policy if exists culture_media_all on public.culture_media;
create policy culture_media_all on public.culture_media
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (parent_id is null or public.owns_culture_medium(parent_id))
    and (
      source_task_id is null
      or exists (
        select 1 from public.tasks t
         where t.id = source_task_id and t.user_id = auth.uid()
      )
    )
  );
