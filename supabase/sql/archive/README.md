# archive/ — 実行しないでください

このディレクトリのファイルは **2025年〜2026年8月にかけて実際に流したSQLの履歴** です。
現行のスキーマは 1つ上の [`../00_baseline.sql`](../00_baseline.sql) に統合済みで、
**新規セットアップでも既存プロジェクトの修復でも、ここのファイルを実行する必要はありません。**

残してあるのは「なぜ今の形になったか」を追うためです（`git log --follow` も効きます）。

## 実行すると何が起きるか

番号が若いファイルほど古い定義を持っているため、**後から入れた修正が黙って巻き戻ります。**
実際に確認した3件:

| 再実行するファイル | 巻き戻る修正 | 起きること |
|---|---|---|
| `02_rls.sql` | `12_share_rls_hardening.sql` | `tasks_all` / `deps_all` / `todos_all` の `with check` が弱い版に戻り、**他人の実験・装置・タスクを参照する行を作れるようになります**（画面上は何も変わらないので気付けません） |
| `11_sharing.sql` | `15_fix_create_lab.sql` | `create_lab()` が `gen_random_bytes()` を使う版に戻り、**「研究室を作成できませんでした」が再発します**（Supabase は pgcrypto を `extensions` スキーマに置くのに、この関数は `search_path = public` 固定のため） |
| `11_sharing.sql` | `14_invitation_dedup.sql` | `share_calendar_by_email()` が `on conflict` の無い版に戻ります。14 が作ったユニーク索引は残るので、今度は**同じ相手に2回共有するとユーザー側にエラーが出ます** |

さらに、次の3箇所は**再実行してはいけないデータ操作**です。

- `06_todos_completed_at.sql` — 完了済みToDoの `completed_at` を **今の時刻で上書き**します
- `14_invitation_dedup.sql` — `share_invitations` を `ctid` 順で `DELETE` します。どの行が残るかは不定で、残った行の `permission` も不定になります
- `16_user_role.sql` — `features.is_teacher` から `role` を再移行します

## 直したいことがあるときは

`00_baseline.sql` を編集するのではなく、`supabase/sql/` に **新しい番号のファイル**（`17_*.sql` 以降）を
追加してください。手順と規約は [`../README.md`](../README.md) にあります。
