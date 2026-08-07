-- =============================================================
-- ラボカレ  CHECK.sql
-- データベースが「今あるべき形」になっているかを確認します。
-- 読み取り専用です。何も変更しません。何度実行しても構いません。
--
-- 使い方: Supabase ダッシュボード → SQL Editor に全文を貼り付けて Run。
--         NG の行が1つも無ければ正常です（NG → 情報 → OK の順に並びます）。
--
-- SQL Editor は「最後の結果セット」しか表示しないため、全ての確認を
-- union all でつないだ単一の SELECT にしてあります。
--
-- ・「relation "public.schema_migrations" does not exist」で落ちた場合は、
--   まだ 00_baseline.sql を実行していません。先にそちらを実行してください。
-- ・新しいSQL（17_*.sql 以降）を足したら、下の expected にも1行足してください。
-- =============================================================

with expected(version, name) as (values
  ('0000', 'baseline'),
  ('0001', 'schema'),
  ('0002', 'rls'),
  ('0003', 'seed_function'),
  ('0004', 'user_settings'),
  ('0005', 'culture_links'),
  ('0006', 'todos_completed_at'),
  ('0007', 'experiments_archived'),
  ('0008', 'culture_media'),
  ('0009', 'profile'),
  ('0010', 'feedback'),
  ('0011', 'sharing'),
  ('0012', 'share_rls_hardening'),
  ('0013', 'shared_profiles'),
  ('0014', 'invitation_dedup'),
  ('0015', 'fix_create_lab'),
  ('0016', 'user_role')
),

expected_tables(t) as (values
  ('equipment'), ('templates'), ('template_steps'), ('experiments'),
  ('tasks'), ('task_dependencies'), ('todos'), ('user_settings'),
  ('culture_media'), ('feedback'), ('labs'), ('lab_members'),
  ('calendar_shares'), ('share_invitations'), ('task_comments'),
  ('schema_migrations')
),

-- 12_share_rls_hardening.sql で入れた「紐づける先も自分のものか」の検証。
-- archive/02_rls.sql や archive/08_culture_media.sql を再実行すると、
-- ここが弱い版に黙って戻ります。
expected_policies(pol, needle, why) as (values
  ('tasks_all',         'experiments',         '紐づける実験・装置・テンプレステップが自分のものか'),
  ('deps_all',          'tasks',               '依存関係の前後どちらのタスクも自分のものか'),
  ('todos_all',         'tasks',               '紐づけるタスクが自分のものか'),
  ('culture_media_all', 'owns_culture_medium', '継代元の培地・紐づく培養タスクが自分のものか')
),

rows_ (kubun, komoku, jotai, shosai) as (

  ----------------------------------------------------------------
  -- 台帳
  ----------------------------------------------------------------
  select '台帳', e.version || '_' || e.name,
         case when m.version is null then 'NG' else 'OK' end,
         case when m.version is null
              then '未適用です。00_baseline.sql を実行してください'
              else to_char(m.applied_at, 'YYYY-MM-DD HH24:MI') || ' 適用（' || m.applied_by || '）'
         end
    from expected e
    left join public.schema_migrations m on m.version = e.version

  union all
  select '台帳', '未知のバージョン ' || m.version, '情報',
         'DBには記録がありますが、このリポジトリの CHECK.sql が知りません。'
         || 'CHECK.sql の expected が古い可能性があります'
    from public.schema_migrations m
    left join expected e on e.version = m.version
   where e.version is null

  ----------------------------------------------------------------
  -- テーブルの有無
  ----------------------------------------------------------------
  union all
  select 'テーブル', t,
         case when to_regclass('public.' || t) is null then 'NG' else 'OK' end,
         case when to_regclass('public.' || t) is null
              then 'ありません。00_baseline.sql を実行してください'
              else '存在します'
         end
    from expected_tables

  union all
  select 'テーブル', 'culture_links', '情報',
         case when to_regclass('public.culture_links') is null
              then '存在しません（正常。08_culture_media.sql 以降は未使用です）'
              else '未使用の古いテーブルが残っています。消したい場合は '
                   || 'optional/99_drop_culture_links.sql を実行してください（任意）'
         end

  ----------------------------------------------------------------
  -- RLS
  ----------------------------------------------------------------
  union all
  select 'RLS', c.relname,
         case when c.relrowsecurity then 'OK' else 'NG' end,
         case when c.relrowsecurity then '有効'
              else '無効です。ログイン中の誰からでも全行が読み書きできます'
         end
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'

  union all
  select 'RLS', 'schema_migrations の権限',
         case when to_regrole('authenticated') is null then '情報'
              when has_table_privilege('authenticated', 'public.schema_migrations', 'select')
              then 'NG' else 'OK' end,
         case when to_regrole('authenticated') is null then 'authenticated ロールがありません（ローカル検証環境）'
              when has_table_privilege('authenticated', 'public.schema_migrations', 'select')
              then 'アプリから台帳が読めます。revoke all on public.schema_migrations from anon, authenticated; を実行してください'
              else 'アプリからは読めません'
         end

  ----------------------------------------------------------------
  -- ポリシーの強度
  ----------------------------------------------------------------
  union all
  select 'ポリシー', ep.pol,
         case when p.policyname is null then 'NG'
              when coalesce(p.with_check, '') ilike '%' || ep.needle || '%' then 'OK'
              else 'NG' end,
         case when p.policyname is null
              then 'ポリシーがありません'
              when coalesce(p.with_check, '') ilike '%' || ep.needle || '%'
              then ep.why || ' を検証しています'
              else ep.why || ' の検証が抜けています。archive/ の古いファイルを再実行した可能性があります。'
                   || '00_baseline.sql を流し直すと直ります'
         end
    from expected_policies ep
    left join pg_policies p
      on p.schemaname = 'public' and p.policyname = ep.pol

  ----------------------------------------------------------------
  -- 関数
  ----------------------------------------------------------------
  union all
  select '関数', 'create_lab',
         case when p.oid is null then 'NG'
              when pg_get_functiondef(p.oid) ilike '%gen_random_bytes%' then 'NG'
              else 'OK' end,
         case when p.oid is null then 'ありません'
              when pg_get_functiondef(p.oid) ilike '%gen_random_bytes%'
              then 'pgcrypto の gen_random_bytes を使っています。Supabase では pgcrypto が '
                   || 'extensions スキーマにあり search_path=public から見えないため、'
                   || '「研究室を作成できませんでした」になります。00_baseline.sql を流し直してください'
              else '組み込みの gen_random_uuid を使っています'
         end
    from (select oid from pg_proc
           where pronamespace = 'public'::regnamespace and proname = 'create_lab' limit 1) p
   right join (select 1) _ on true

  union all
  select '関数', 'share_calendar_by_email',
         case when p.oid is null then 'NG'
              when pg_get_functiondef(p.oid) ilike '%on conflict (owner_id%' then 'OK'
              else 'NG' end,
         case when p.oid is null then 'ありません'
              when pg_get_functiondef(p.oid) ilike '%on conflict (owner_id%'
              then '重複した招待を作りません'
              else '重複対策（on conflict）が入っていません。同じ相手に2回共有すると '
                   || 'idx_invitations_pending_uniq に弾かれてユーザーにエラーが出ます。'
                   || '00_baseline.sql を流し直してください'
         end
    from (select oid from pg_proc
           where pronamespace = 'public'::regnamespace
             and proname = 'share_calendar_by_email' limit 1) p
   right join (select 1) _ on true

  union all
  select '関数', 'visible_profiles',
         case when to_regprocedure('public.visible_profiles()') is null then 'NG' else 'OK' end,
         case when to_regprocedure('public.visible_profiles()') is null
              then 'ありません。共有相手やメンバーの名前が出ません'
              else '存在します'
         end

  union all
  select '関数', p.proname || ' の search_path',
         case when p.proconfig @> array['search_path=public'] then 'OK' else 'NG' end,
         case when p.proconfig @> array['search_path=public']
              then 'security definer + search_path 固定'
              else 'security definer なのに search_path が固定されていません。'
                   || '呼び出し側の search_path 次第で別のスキーマの関数を実行させられます'
         end
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef

  ----------------------------------------------------------------
  -- 権限
  ----------------------------------------------------------------
  union all
  select '権限', 'seed_demo_data の実行権',
         case when to_regprocedure('public.seed_demo_data()') is null then 'NG'
              when to_regrole('anon') is null then '情報'
              when has_function_privilege('anon', 'public.seed_demo_data()', 'execute')
              then 'NG' else 'OK' end,
         case when to_regprocedure('public.seed_demo_data()') is null then 'ありません'
              when to_regrole('anon') is null then 'anon ロールがありません（ローカル検証環境）'
              when has_function_privilege('anon', 'public.seed_demo_data()', 'execute')
              then '未ログイン(anon)からも呼べます。関数の中で auth.uid() を検査しているので '
                   || '実害はありませんが、00_baseline.sql を流すと revoke されます'
              else 'ログイン済み(authenticated)だけが呼べます'
         end

  ----------------------------------------------------------------
  -- インデックス・カラム
  ----------------------------------------------------------------
  union all
  select 'インデックス', 'idx_invitations_pending_uniq',
         case when to_regclass('public.idx_invitations_pending_uniq') is null
              then 'NG' else 'OK' end,
         case when to_regclass('public.idx_invitations_pending_uniq') is null
              then 'ありません。同じ相手への招待が重複して /shared に並びます'
              else '未受諾の招待は相手・範囲ごとに1件だけです'
         end

  union all
  select 'カラム', 'user_settings.role',
         case when c.column_name is null then 'NG'
              when c.is_nullable = 'YES' then 'NG'
              else 'OK' end,
         case when c.column_name is null
              then 'ありません。利用形態（学生 / 教授・指導者）を保存できません'
              when c.is_nullable = 'YES' then 'NULL を許しています'
              else '既定値 ' || coalesce(c.column_default, '(なし)')
         end
    from (select 1) _
    left join information_schema.columns c
      on c.table_schema = 'public' and c.table_name = 'user_settings'
     and c.column_name = 'role'

  union all
  select 'カラム', 'user_settings.role の値の制約',
         case when exists (
                select 1 from pg_constraint where conname = 'user_settings_role_check'
              ) then 'OK' else 'NG' end,
         case when exists (
                select 1 from pg_constraint where conname = 'user_settings_role_check'
              ) then $$'student' / 'teacher' に限定されています$$
              else '制約がありません。綴りを間違えた値が入りえます'
         end

  union all
  select '移行', 'features の is_teacher',
         case when n = 0 then 'OK' else 'NG' end,
         case when n = 0
              then '残っていません（role カラムに一本化済み）'
              else n::text || ' 行に残っています。role とどちらが正か分からない状態です。'
                   || 'archive/16_user_role.sql の update 2文を実行すると移行できます'
         end
    from (select count(*) as n from public.user_settings where features ? 'is_teacher') s
)

select kubun  as "区分",
       komoku as "項目",
       jotai  as "状態",
       shosai as "詳細"
  from rows_
 order by case jotai when 'NG' then 0 when '情報' then 1 else 2 end,
          kubun, komoku;
