-- =============================================================
-- ラボカレ  17_set_features.sql
-- 表示設定（user_settings.features）を「消さずに」保存できるようにします。
--
-- これまでアプリは features(jsonb) の中身を全部組み立てて丸ごと上書きして
-- いました。組み立ての土台にしていたのが画面側のキャッシュだったため、
-- キャッシュが空のまま何か1つ保存すると、他のフラグ（研究分野の選択済み・
-- 利用形態の選択済み・配色）が**まとめて消える**状態でした。
-- 実際に「既にログインしたことがある人へ、再ログインのたびに
-- オンボーディングが出る」という形で表に出ています。
--
-- 対策として、部分更新をDB側で行う関数を用意します。jsonb の `||` は
-- 浅いマージなので、渡したキーだけが上書きされ、他のキーは必ず残ります。
--
-- ・security invoker: RLS をそのまま効かせる（自分の行しか触れない）
-- ・1文で insert / update を済ませるので、2つのタブから同時に保存しても壊れない
--
-- 00_baseline.sql の後に実行してください。何度実行しても安全です。
-- =============================================================

create or replace function public.set_features(patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  merged jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- 配列や文字列を渡されると `||` の意味が変わってしまう（結合になる）ため、
  -- オブジェクト以外は受け付けない
  if patch is null or jsonb_typeof(patch) <> 'object' then
    raise exception 'patch must be a json object';
  end if;

  insert into user_settings (user_id, features, updated_at)
  values (uid, patch, now())
  on conflict (user_id) do update
    set features   = user_settings.features || excluded.features,
        updated_at = now()
  returning features into merged;

  return merged;
end;
$$;

revoke execute on function public.set_features(jsonb) from public;
grant execute on function public.set_features(jsonb) to authenticated;

-- -------------------------------------------------------------
-- 台帳へ記録（CHECK.sql がここを読みます）
-- -------------------------------------------------------------
insert into public.schema_migrations(version, name)
values ('0017', 'set_features')
on conflict (version) do nothing;
