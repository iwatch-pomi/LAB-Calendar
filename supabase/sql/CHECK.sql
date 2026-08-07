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
  ('0016', 'user_role'),
  ('0017', 'set_features'),
  ('0018', 'backfill_onboarded'),
  ('0019', 'revoke_anon_execute'),
  ('0020', 'delete_own_account'),
  ('0021', 'account_deletion_grace'),
  ('0022', 'schedule_purge')
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

-- RLSポリシーの式（using / with check）の中から呼ばれている public の関数。
-- これらは anon にも実行権が必要（無いとポリシーを評価できずエラーになる）。
policy_fns as (
  select distinct p.proname
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and exists (
       select 1 from pg_policies pol
        where pol.schemaname = 'public'
          and (coalesce(pol.qual, '') || ' ' || coalesce(pol.with_check, ''))
              like '%' || p.proname || '(%'
     )
),

-- 「まだ適用していないSQLが作るもの」を見に行くための逃げ道。
--
-- CHECK.sql は1本の SELECT なので、存在しない列や関数の名前を素で書くと
-- PostgreSQL が**実行前の解析で落ち**、台帳の行すら1つも出ません。
-- 「未適用を知らせる」ための CHECK.sql が「未適用だと動かない」のでは
-- 意味がないので、問い合わせを**文字列として組み立て**、対象が実在する
-- ときだけ中身のあるSQLにして query_to_xml で実行します。
-- （query_to_xml は引数の text をその場で実行するので、解析時に名前を
--   解決しません。無ければ 'select null' 側を渡すだけで済みます）
--
-- 新しい列や関数を CHECK.sql から見たくなったら、ここに1行足してください。
dyn(key, val) as (
  select q.key,
         (xpath('/row/v/text()', query_to_xml(q.sql, false, true, '')))[1]::text
    from (values
      -- 21/22 … 退会の定期実行が登録されているか
      ('purge_job',
       case when to_regprocedure('public.purge_job_scheduled()') is null
            then 'select null as v'
            else 'select public.purge_job_scheduled()::text as v' end),
      -- 21 … 削除待ちのアカウント数
      ('pending',
       case when not exists (
              select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'user_settings'
                 and column_name = 'deletion_scheduled_at')
            then 'select null as v'
            else 'select count(*)::text as v from public.user_settings'
                 || ' where deletion_scheduled_at is not null' end),
      -- 21 … そのうち期限を過ぎたのに残っているもの（＝定期実行が動いていない証拠）
      ('overdue',
       case when not exists (
              select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'user_settings'
                 and column_name = 'deletion_scheduled_at')
            then 'select null as v'
            else 'select count(*)::text as v from public.user_settings'
                 || ' where deletion_scheduled_at is not null'
                 || '   and deletion_scheduled_at <= now()' end)
    ) q(key, sql)
),

rows_ (kubun, komoku, jotai, shosai) as (

  ----------------------------------------------------------------
  -- 台帳
  ----------------------------------------------------------------
  select '台帳', e.version || '_' || e.name,
         case when m.version is null then 'NG' else 'OK' end,
         case when m.version is null
              -- 0000〜0016 はベースラインに統合済み。0017 以降は個別ファイル。
              then case when e.version <= '0016'
                        then '未適用です。00_baseline.sql を実行してください'
                        else '未適用です。'
                             || ltrim(e.version, '0') || '_' || e.name
                             || '.sql を実行してください'
                   end
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
  select '関数', 'set_features',
         case when to_regprocedure('public.set_features(jsonb)') is null
              then 'NG' else 'OK' end,
         case when to_regprocedure('public.set_features(jsonb)') is null
              then 'ありません。表示設定を保存すると他の設定（研究分野の選択済み・'
                   || '利用形態・配色）が消えます。17_set_features.sql を実行してください'
              else '表示設定を1つ変えても他のフラグを消しません'
         end

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
  -- 関数は1本ずつ見る。以前は seed_demo_data だけを見ていたが、実際には
  -- public の全関数が同じ状態だった（Supabase の既定権限が anon へ明示的に
  -- EXECUTE を付けるため）。1本だけ見ていると過少報告になる。
  --
  -- ただし RLSポリシーの式から呼ばれる関数は anon にも実行権が要る。
  -- 落とすと anon の SELECT が「0件」ではなく「permission denied」になる。
  -- そこで「ポリシーが呼んでいるか」で判定を分ける。こう書いておけば、
  -- 関数を足したときに一覧を更新しなくても正しく判定できる。
  union all
  select '権限', p.proname || '() の anon 実行権',
         case when to_regrole('anon') is null then '情報'
              when not has_function_privilege('anon', p.oid, 'execute') then 'OK'
              when policy_fns.proname is not null then 'OK'
              else 'NG' end,
         case when to_regrole('anon') is null
              then 'anon ロールがありません（ローカル検証環境）'
              when not has_function_privilege('anon', p.oid, 'execute')
              then 'ログイン済み(authenticated)だけが呼べます'
              when policy_fns.proname is not null
              then 'RLSポリシーから呼ばれるため anon にも必要（中で auth.uid() を見るので空が返る）'
              else '未ログインからも直接呼べます。19_revoke_anon_execute.sql を実行してください'
         end
    from pg_proc p
    left join policy_fns on policy_fns.proname = p.proname
   where p.pronamespace = 'public'::regnamespace

  -- 退会機能は auth.users の行を消すことで成り立っている。関数があっても
  -- 所有者に auth.users への DELETE 権限が無ければ実行時に失敗するので、
  -- 「押したら失敗する退会ボタン」にならないよう権限まで確かめる。
  union all
  select '関数', 'delete_own_account',
         case when p.oid is null then 'NG'
              when not has_table_privilege(p.proowner::regrole::text, 'auth.users', 'delete')
              then 'NG' else 'OK' end,
         case when p.oid is null
              then 'ありません。マイページの退会が動きません。'
                   || '20_delete_own_account.sql を実行してください'
              when not has_table_privilege(p.proowner::regrole::text, 'auth.users', 'delete')
              then '関数はありますが、所有者（' || p.proowner::regrole::text
                   || '）に auth.users を削除する権限がありません。退会が実行時に失敗します'
              else '退会できます（自分の行のみ削除。他のデータは連鎖で消えます）'
         end
    from (select 1) _
    left join pg_proc p
      on p.pronamespace = 'public'::regnamespace
     and p.proname = 'delete_own_account'

  -- 退会の予約を実際に実行する仕組み。これが動いていないと、画面で
  -- 「7日後に削除します」と約束しておいて実際には消えない状態になる。
  union all
  select '退会', '期限切れアカウントの自動削除',
         case when j.val = 'true' then 'OK' else 'NG' end,
         case when j.val is null
              then '猶予つき退会がまだ入っていません。'
                   || '21_account_deletion_grace.sql を実行してください'
              when j.val = 'true'
              then '毎日実行されます（pg_cron: labocale-purge-expired-accounts）'
              else '定期実行が登録されていません。退会を予約しても実際には削除されません。'
                   || 'pg_cron を有効化して 22_schedule_purge.sql を実行してください'
         end
    from (select val from dyn where key = 'purge_job') j

  union all
  select '退会', '削除待ちのアカウント', '情報',
         p.val || ' 件'
         || case when o.val in ('0', '') or o.val is null then ''
                 else ' / うち期限切れ ' || o.val || ' 件（未削除）' end
    from (select val from dyn where key = 'pending') p,
         (select val from dyn where key = 'overdue') o
   where p.val is not null

  union all
  select '関数', 'seed_demo_data',
         case when to_regprocedure('public.seed_demo_data()') is null
              then 'NG' else 'OK' end,
         case when to_regprocedure('public.seed_demo_data()') is null
              then 'ありません。初回ログイン時のデモデータ投入ができません'
              else '存在します'
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
