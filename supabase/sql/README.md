# supabase/sql/ — データベースの作り方と変え方

Supabase CLI は使いません。**ダッシュボード → SQL Editor に貼り付けて Run** するだけです。

| ファイル | いつ使うか |
|---|---|
| [`00_baseline.sql`](00_baseline.sql) | 最初に1回。既存プロジェクトに流し直しても安全（データには触れません） |
| [`CHECK.sql`](CHECK.sql) | 何かを流したあと毎回。NG が無ければ正常 |
| [`_TEMPLATE.sql`](_TEMPLATE.sql) | 新しいSQLを書くときの雛形 |
| [`optional/`](optional/) | 任意。実行しなくても動きます |
| [`archive/`](archive/) | **実行しないでください。** 履歴です（[理由](archive/README.md)） |

---

## 新規セットアップ

1. SQL Editor に `00_baseline.sql` を全文貼り付けて Run
2. **`00_baseline.sql` より後の番号付きファイルを、番号順に全て** Run
   （`17_set_features.sql` → `18_backfill_onboarded.sql` → `19_…` → …）
3. `CHECK.sql` を全文貼り付けて Run し、**NG が0件**であることを確認

`archive/` の 01〜16 は流す必要がありません（`00_baseline.sql` に統合済みです）。

> ⚠️ **2 を飛ばさないでください。** `00_baseline.sql` は「01〜16 をまとめたもの」で
> あって「最新の全部」ではありません。17 以降を流さないと、たとえば
> `set_features` が無いまま動き、**表示設定を保存するたびに他の設定が消えます**。
> 飛ばしたかどうかは 3 の `CHECK.sql` が台帳で検出します（未適用の番号が NG で出ます）。

## DBを変えたくなったら

1. `_TEMPLATE.sql` をコピーして `17_なにか.sql` を作る（番号は既存の最大 + 1）
2. **SQL Editor で実行する**
3. `CHECK.sql` で確認する
4. **型を作り直す**（下記）
5. **そのあとで**アプリのコードを push する

順番が大事です。逆にすると、テーブルがまだ無い状態のコードが本番で動きます。

### 4 の「型を作り直す」

Supabase ダッシュボード → **Project Settings → API → Generating types** に出る
TypeScript をコピーして、`lib/database.types.ts` を**丸ごと置き換え**ます。
SQL と同じ「貼り付けるだけ」の運用です。

これをやると、**列名を変えたのにコードを直し忘れた場合に `npm run build` が止まります。**
以前は Supabase クライアントが `any` だったので、ビルドは通って本番で初めて落ちていました。

置き換えたあと `npm run typecheck` を走らせて、赤くなった箇所を直してください。
`text + check(...)` の列（`tasks.status` など）は生成された型では `string` になります。
UI 側のユニオン型へは `lib/dbRows.ts` で変換しているので、列が増えたらそこにも足します。

---

## 規約

**それぞれ、このリポジトリで実際に起きた事故に対応しています。**

### 1. 適用済みのファイルは編集しない。必ず新しい番号で追記する

`archive/03_seed_function.sql` は適用後に中身を書き換えられています（`5098d2d`）。
その結果「番号を見れば適用状態が分かる」という前提が一度崩れました。
**書き換えても、既に流したDBは変わりません。**

### 2. DDL は必ず冪等に書く

`if not exists` / `or replace` / `drop … if exists` → `create`。
同じファイルを2回流しても同じ結果になるようにします。

`do $$ … end $$;` で「もう適用済みならスキップ」という自己ガードは**書きません**。
理由は3つあります。

- この repo の関数定義は全て `$$` を使うので、外側を `do $$` で包むとタグが入れ子になる
- `DO` ブロックの中の構文エラーは行番号が出ず、Webエディタで場所を追えない
- スキップしたときも「Success」と出るので、**実行されたのかどうか区別が付かない**

### 3. 制約の追加は存在チェックで囲む

`add constraint` には `if not exists` がありません。`_TEMPLATE.sql` の書き方を使ってください。

`create table` の中に書くのも駄目です。既にテーブルがあるDBでは
`create table if not exists` ごとスキップされ、**制約が付かないまま「Success」になります**
（`archive/16_user_role.sql` がこの形で書かれているのはそのためです）。

### 4. データを変える文（`update` / `delete`）はマイグレーションに書かない

`archive/` の3ファイルがこれをやっていて、いずれも再実行できません。

- `06` の `update todos set completed_at = now()` — 流すたび完了日時が今に上書きされる
- `14` の `delete … where a.ctid > b.ctid` — 残る行が不定
- `16` の `update … set role = 'teacher'` — 一度移行したら二度と流せない

どうしても必要なら `NN_backfill_*.sql` として**別ファイルに分け**、
台帳（`schema_migrations`）を見て一度だけ流してください。
`00_baseline.sql` にデータを変える文が1つも無いのは、この規約のためです。

### 5. 関数の権限は `from public, anon` を revoke してから grant する

```sql
revoke execute on function public.xxx(...) from public, anon;
grant  execute on function public.xxx(...) to authenticated;
```

**`from public` だけでは足りません。** Supabase は `public` スキーマの既定権限として、
新しく作られた関数の EXECUTE を `anon` / `authenticated` / `service_role` へ
**明示的に**付与します。`from public` は PUBLIC 擬似ロールの分しか外さないので、
anon への付与が残ります:

```
postgres=X/postgres
anon=X/postgres           ← from public では消えない
authenticated=X/postgres
service_role=X/postgres
```

`archive/03_seed_function.sql` は `grant` しか書いていなかったうえ、
`00_baseline.sql` で足した revoke も `from public` だけだったため、
**未ログイン(anon)からも全ての関数を呼べる状態**が残っていました
（`19_revoke_anon_execute.sql` で解消）。

> ⚠️ **RLSポリシーの中から呼ぶ関数は anon にも grant が要ります。**
> 落とすと anon の SELECT が「0件」ではなく `permission denied for function …`
> というエラーになります（ポリシーの式を評価できなくなるため）。
> 該当するかは `CHECK.sql` が自動で判定します。

### 6. `returns table(...)` の列を増やすときは `create or replace` が使えない

`drop function` してから作り直します。このとき**ACL が消えるので revoke/grant を書き直します**。
`visible_profiles()` がこの形です。

### 7. `security definer` + `search_path = public` の関数から pgcrypto を裸で呼ばない

Supabase は pgcrypto を `extensions` スキーマに入れます。`search_path` を `public` に
固定した関数からは見えず、**ローカルでは動くのに本番だけ落ちます**。
`create_lab()` が `gen_random_bytes()` で落ちていたのがこれです（`archive/15_fix_create_lab.sql`）。

組み込みの `gen_random_uuid()`（PostgreSQL 13以降、`pg_catalog`）は `search_path` に
左右されないので安全です。

### 8. ポリシーは「最終形」を書く。過去のファイルからコピーしない

`archive/02_rls.sql` の `tasks_all` は `archive/12_share_rls_hardening.sql` の強化版に
置き換わっています。02 をコピーして使うと、**セキュリティが黙って下がります**
（画面上は何も変わらないので気付けません）。`00_baseline.sql` の現行版を見てください。

### 9. ファイルの末尾で台帳に記録する

```sql
insert into public.schema_migrations(version, name)
values ('0017', 'なにか')
on conflict (version) do nothing;
```

あわせて `CHECK.sql` の `expected` にも同じ行を足します。足さないと
「未知のバージョン」として『情報』行に出ます（エラーにはなりません）。

### 10. SQL を先に流してから、コードをデプロイする

逆にすると、テーブルや列がまだ無い状態のコードが本番で動きます。
このアプリは読み取り失敗を握り潰す箇所があるので、**画面には「データが無い」ように見えます**。

### 11. 列やテーブルの削除は二段階に分ける

1. アプリ側の参照を消して**デプロイし、しばらく様子を見る**
2. 後日、別のファイルで `drop`

Vercel は古いデプロイをすぐには止めません。同時に消すと、
まだ動いている古いコードが落ちます。

---

## 台帳（`public.schema_migrations`）について

どのファイルまで適用したかをDB自身に記録するテーブルです。

**記録しているのは「到達したスキーマの状態」であって、過去のデータ移行を
実行したかどうかではありません。** 新規DBに `00_baseline.sql` を流すと
`0000`〜`0016` の17行が一度に入りますが、これは
「16まで流したのと同じ形になった」という意味です。

アプリからは読めません（RLS 有効＋ポリシー0件、かつ `anon` / `authenticated` から
`revoke all`）。SQL Editor はテーブル所有者として動くので RLS を迂回でき、
運用には支障ありません。
