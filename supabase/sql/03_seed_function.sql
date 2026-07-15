-- =============================================================
-- ラボカレ  03_seed_function.sql
-- 初回ログイン時にアプリから呼ばれる seed_demo_data() を定義します。
-- 呼び出し時点の「今週(月曜始まり, Asia/Tokyo)」を基準に、
-- スクリーンショットと同じデモデータを投入します。
-- 01_schema.sql / 02_rls.sql の後に実行してください。
-- =============================================================

create or replace function public.seed_demo_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz  text := 'Asia/Tokyo';
  monday date;
  -- 装置
  eq_centrifuge uuid;
  eq_akta uuid;
  -- テンプレ
  tpl_ecoli uuid;
  tpl_plasmid uuid;
  tpl_sds uuid;
  -- 実験
  exp_ecoli uuid;
  exp_plasmid uuid;
  -- タスク
  t_pre uuid; t_main uuid; t_wait uuid; t_iptg uuid;
  t_harvest uuid; t_sonic uuid; t_ninta uuid; t_sds uuid; t_result uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 既にデータがあれば何もしない（二重投入防止）
  if exists (select 1 from experiments where user_id = uid) then
    return;
  end if;

  monday := (date_trunc('week', (now() at time zone tz)))::date;

  -- 日付＋時刻から timestamptz を作るローカル式:
  --   ((monday + d)::timestamp + make_interval(hours=>h, mins=>mi)) at time zone tz

  ---------------------------------------------------------------
  -- 装置
  ---------------------------------------------------------------
  insert into equipment(user_id, name, color) values (uid, '遠心機', 'sky')
    returning id into eq_centrifuge;
  insert into equipment(user_id, name, color) values (uid, 'AKTA', 'violet')
    returning id into eq_akta;

  ---------------------------------------------------------------
  -- テンプレート（実験を追加メニュー用）
  ---------------------------------------------------------------
  -- 大腸菌タンパク質発現（全6ステップ・約4日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, '大腸菌タンパク質発現', '全6ステップ・約4日・遠心機/AKTA', '約4日', 6, 'teal')
    returning id into tpl_ecoli;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_ecoli, 1, '前培養（LB液体）', null,        0, 90,  810, null,   false),
    (tpl_ecoli, 2, '本培養 開始',       null,        0, 60,  0,   null,   false),
    (tpl_ecoli, 3, '培養待機',          '37℃ / 6h',  0, 360, 0,   null,   false),
    (tpl_ecoli, 4, 'IPTG誘導',          null,        0, 30,  990, null,   false),
    (tpl_ecoli, 5, '菌体回収・遠心',    null,        0, 120, 0,   '遠心機', true),
    (tpl_ecoli, 6, 'Ni-NTA 精製',       null,        0, 180, 0,   'AKTA', true);

  -- プラスミド抽出＋制限酵素（全4ステップ・約1日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, 'プラスミド抽出＋制限酵素', '全4ステップ・約1日', '約1日', 4, 'violet')
    returning id into tpl_plasmid;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_plasmid, 1, 'ミニプレップ',       null, 0, 60, 0,  null, false),
    (tpl_plasmid, 2, '制限酵素処理',       '37℃', 0, 90, 60, null, false),
    (tpl_plasmid, 3, 'アガロース電気泳動', null, 0, 60, 0,  null, false),
    (tpl_plasmid, 4, '精製・確認',         null, 0, 60, 0,  null, false);

  -- SDS-PAGE 電気泳動（全3ステップ・半日）
  insert into templates(user_id, name, description, estimated_label, total_steps, color)
    values (uid, 'SDS-PAGE 電気泳動', '全3ステップ・半日', '半日', 3, 'sky')
    returning id into tpl_sds;
  insert into template_steps(template_id, step_order, title, subtitle, offset_from_prev_minutes, duration_minutes, wait_after_minutes, equipment_name, needs_reservation) values
    (tpl_sds, 1, 'サンプル調製', null, 0, 30,  0,  null, false),
    (tpl_sds, 2, '電気泳動',     null, 0, 90,  0,  null, false),
    (tpl_sds, 3, '染色・脱色',   null, 0, 120, 30, null, false);

  ---------------------------------------------------------------
  -- 実験 1: 大腸菌タンパク質発現（進行中・ステップ2/6）
  ---------------------------------------------------------------
  insert into experiments(user_id, template_id, name, status, current_step, total_steps, color)
    values (uid, tpl_ecoli, '大腸菌タンパク質発現', 'in_progress', 2, 6, 'teal')
    returning id into exp_ecoli;

  -- タスク（曜日: 月=0, 火=1, 水=2, 木=3, 金=4）
  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '前培養（LB液体）', null,
      ((monday + 0)::timestamp + make_interval(hours=>18, mins=>0))  at time zone tz,
      ((monday + 0)::timestamp + make_interval(hours=>19, mins=>30)) at time zone tz,
      'done', null, false, false) returning id into t_pre;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '本培養 開始', null,
      ((monday + 1)::timestamp + make_interval(hours=>9))  at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz,
      'done', null, false, false) returning id into t_main;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '培養待機', '37℃ / 6h',
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>16)) at time zone tz,
      'planned', null, false, true) returning id into t_wait;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'IPTG誘導', null,
      ((monday + 1)::timestamp + make_interval(hours=>16, mins=>0))  at time zone tz,
      ((monday + 1)::timestamp + make_interval(hours=>16, mins=>30)) at time zone tz,
      'planned', null, false, false) returning id into t_iptg;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '菌体回収・遠心', null,
      ((monday + 2)::timestamp + make_interval(hours=>9))  at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>11)) at time zone tz,
      'planned', eq_centrifuge, true, false) returning id into t_harvest;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '超音波破砕', null,
      ((monday + 2)::timestamp + make_interval(hours=>11)) at time zone tz,
      ((monday + 2)::timestamp + make_interval(hours=>12)) at time zone tz,
      'planned', null, false, false) returning id into t_sonic;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'Ni-NTA 精製', null,
      ((monday + 3)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 3)::timestamp + make_interval(hours=>13)) at time zone tz,
      'planned', eq_akta, true, false) returning id into t_ninta;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, 'SDS-PAGE 確認', null,
      ((monday + 3)::timestamp + make_interval(hours=>14)) at time zone tz,
      ((monday + 3)::timestamp + make_interval(hours=>17)) at time zone tz,
      'planned', null, false, false) returning id into t_sds;

  insert into tasks(user_id, experiment_id, title, subtitle, start_time, end_time, status, equipment_id, needs_reservation, is_wait)
    values (uid, exp_ecoli, '結果まとめ', null,
      ((monday + 4)::timestamp + make_interval(hours=>10)) at time zone tz,
      ((monday + 4)::timestamp + make_interval(hours=>12)) at time zone tz,
      'planned', null, false, false) returning id into t_result;

  -- 依存関係チェーン（gap_minutes は培養/誘導などの待ち時間）
  insert into task_dependencies(user_id, predecessor_id, successor_id, gap_minutes) values
    (uid, t_pre,     t_main,    810),  -- 前培養→本培養（一晩）
    (uid, t_main,    t_wait,    0),
    (uid, t_wait,    t_iptg,    0),
    (uid, t_iptg,    t_harvest, 990),  -- IPTG誘導→回収（一晩発現）
    (uid, t_harvest, t_sonic,   0),
    (uid, t_sonic,   t_ninta,   0),
    (uid, t_ninta,   t_sds,     0),
    (uid, t_sds,     t_result,  0);

  ---------------------------------------------------------------
  -- 実験 2: プラスミド抽出＋制限酵素（未着手・全4ステップ）
  ---------------------------------------------------------------
  insert into experiments(user_id, template_id, name, status, current_step, total_steps, color)
    values (uid, tpl_plasmid, 'プラスミド抽出＋制限酵素', 'planning', 0, 4, 'violet')
    returning id into exp_plasmid;

  ---------------------------------------------------------------
  -- 今日の ToDo
  ---------------------------------------------------------------
  insert into todos(user_id, title, due_at, done, sort_order) values
    (uid, 'LB培地＋アンピシリンの準備', null, true, 0),
    (uid, '本培養の吸光度（OD600）を測定',
      ((monday + 1)::timestamp + make_interval(hours=>10)) at time zone tz, false, 1),
    (uid, '遠心機（水 9:00）の予約を確定',
      ((monday + 2)::timestamp + make_interval(hours=>9)) at time zone tz, false, 2),
    (uid, 'SDS-PAGE 用ゲルの発注', null, false, 3);

end;
$$;

grant execute on function public.seed_demo_data() to authenticated;
