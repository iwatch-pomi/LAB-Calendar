# ラボカレ (LaboCale)

理系学生・大学院生の卒業研究に特化した、実験プロセス管理カレンダー。
複数日にわたる実験ステップをテンプレートからワンクリック登録でき、共通装置（遠心機 / AKTA
など）の予約と培養・計算の待ち時間を考慮します。最大の特徴は **実験失敗時の
「依存関係に基づく自動リスケジュール」** — 予定を依存関係で紐付けておくと、失敗した
ステップと後続タスクを装置予約・稼働時間を考慮して最も早い空き日程へ一括再配置します。

- **フレームワーク**: Next.js 15 (App Router) + React 19 + TypeScript
- **DB / 認証**: Supabase (Postgres + Auth + Row Level Security)
- **UI**: Tailwind CSS / lucide-react、カレンダーは @dnd-kit でフルドラッグ＆ドロップ
- **データ取得**: TanStack Query
- **デプロイ**: Vercel

---

## クイックスタート（Vercel だけで確認・ローカル環境不要）

ローカルに何もインストールせず、ブラウザ操作だけで公開・確認できます。
**Supabase → Vercel の順**で進めるのがコツ（先に DB を用意しておくと初回ログインで
デモデータが自動投入されます）。

### STEP 1. Supabase プロジェクトを作成

1. [supabase.com](https://supabase.com) にログインし **New project** を作成（無料枠でOK）。
2. 作成後、**Project Settings → API** で次の2つを控えておく（STEP 3 で使用）:
   - **Project URL**（例: `https://xxxx.supabase.co`）
   - **anon public** キー（`eyJhbGci...`）

### STEP 2. データベースを作る（SQL エディター）

左メニューの **SQL Editor** を開き、リポジトリの以下を **この順番で** 貼り付けて Run:

1. `supabase/sql/01_schema.sql` … テーブル・インデックス
2. `supabase/sql/02_rls.sql` … Row Level Security（ユーザーごとのデータ隔離）
3. `supabase/sql/03_seed_function.sql` … デモデータ投入用 `seed_demo_data()` 関数

> デモデータは初回ログイン時にアプリが自動で `seed_demo_data()` を呼び出し、
> **その週（月曜始まり）** を基準にスクリーンショットと同じ実験・予定・ToDo を投入します。

### STEP 3. Vercel にデプロイ

1. [vercel.com](https://vercel.com) に GitHub でログイン → **Add New… → Project**。
2. このリポジトリをインポートし、ブランチ `claude/labocale-research-scheduler-czuqub`
   を選択（Framework は Next.js が自動検出）。
3. **Environment Variables** に STEP 1 の値を登録（**デプロイ前に必ず設定**）:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |

4. **Deploy**。発行される URL（例 `https://lab-calendar-xxx.vercel.app`）を控える。

> ⚠️ 環境変数はビルド時に必要です。未設定のままデプロイするとビルドが失敗するので、
> STEP 3-3 を必ず先に済ませてください。

### STEP 4. ログインを有効化（Supabase → Authentication）

**Providers** で使う方式を有効化:

- **Email**（最短）: 既定で有効。動作確認だけなら **Confirm email をオフ**にすると
  メール登録後すぐログインできます。
- **Google**: Google Cloud で OAuth クライアントを作成し Client ID / Secret を登録。
- **Apple**: Apple Developer で Service ID・Key を作成し登録。

**URL Configuration** に STEP 3 の Vercel URL を登録:

- **Site URL**: `https://lab-calendar-xxx.vercel.app`
- **Redirect URLs** に追加:
  ```
  https://lab-calendar-xxx.vercel.app/auth/callback
  https://<プロジェクト名>-*.vercel.app/auth/callback   # プレビュー用（任意）
  ```

### STEP 5. 確認

Vercel の URL を開く → ログイン → 写真通りのデモカレンダーが表示されます。
コードを GitHub に push するたび Vercel が自動で再デプロイします。

---

## ローカルで開発する場合（任意）

Vercel だけで確認するなら不要です。手元で開発・改修したいときのみ:

```bash
npm install
cp .env.local.example .env.local   # STEP 1 の URL / anon key を記入
npm run dev                        # http://localhost:3000
```

ローカル用に Supabase の **Redirect URLs** へ `http://localhost:3000/auth/callback`
も追加してください。

---

## 使い方

- **実験を追加**: ヘッダー右上「＋実験を追加」→ テンプレートを選ぶと、一連のステップが
  待ち時間・装置予約を考慮して一括登録されます。「テンプレを作成」で独自テンプレも作成可能。
- **予定の移動 / 長さ変更**: カレンダー上のブロックをドラッグで移動、下端をドラッグでリサイズ。
- **依存関係**: 予定をクリック → モーダルで「前提タスク」を追加。つないだタスクは失敗時に連動します。
- **失敗 → 自動リスケ**: 予定をクリック →「失敗 → 自動リスケ」。移動プレビューを確認して実行すると、
  後続タスクが装置予約・稼働時間（既定 8:00–20:00・平日）を避けて最も早い空きへ再配置されます。

---

## 開発コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
npm run test       # 自動リスケのユニットテスト (vitest)
```

## 構成メモ

- コアの自動リスケは `lib/reschedule.ts`（DB 非依存の純粋関数、`lib/reschedule.test.ts` で検証）。
- テンプレート展開は `lib/expandTemplate.ts`。
- 時刻計算はブラウザのタイムゾーンに依存せず Asia/Tokyo 固定（`lib/calendar.ts` / `lib/config.ts`）。
- データ取得は `lib/queries.ts`、複合的な書き込み（テンプレ展開・リスケ確定）は `lib/mutations.ts`。
- 認証コールバックは `app/auth/callback/route.ts`（`x-forwarded-host` 対応で Vercel の
  本番・プレビュー両ドメインに追従）。
