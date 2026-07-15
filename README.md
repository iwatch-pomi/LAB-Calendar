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
- **デプロイ**: Vercel 前提

---

## 1. セットアップ手順

### 1-1. リポジトリと依存関係

```bash
npm install
cp .env.local.example .env.local   # 値は 1-3 で設定
```

### 1-2. Supabase プロジェクトと SQL

1. [supabase.com](https://supabase.com) でプロジェクトを作成。
2. ダッシュボードの **SQL Editor** を開き、以下を **この順番で** 貼り付けて実行します。
   （各ファイルの中身をそのままコピーして「Run」）
   1. `supabase/sql/01_schema.sql` … テーブル・インデックス
   2. `supabase/sql/02_rls.sql` … Row Level Security（ユーザーごとのデータ隔離）
   3. `supabase/sql/03_seed_function.sql` … デモデータ投入用の `seed_demo_data()` 関数

> デモデータは初回ログイン時にアプリが自動で `seed_demo_data()` を呼び出し、
> **その週（月曜始まり）** を基準にスクリーンショットと同じ実験・予定・ToDo を投入します。

### 1-3. 環境変数

Supabase の **Project Settings → API** から取得し、`.env.local` に設定します。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 1-4. 認証プロバイダの設定（Supabase → Authentication → Providers）

- **Email**: 既定で有効。開発中は「Confirm email」をオフにするとすぐログインできます。
- **Google**: Google Cloud で OAuth クライアントを作成し、Client ID / Secret を登録。
- **Apple**: Apple Developer で Service ID・Key を作成し登録（Developer 加入済み前提）。

**Redirect URLs**（Authentication → URL Configuration）に以下を追加:

```
http://localhost:3000/auth/callback
https://<your-vercel-domain>/auth/callback
https://<your-project>-*.vercel.app/auth/callback   # プレビュー用
```

`Site URL` は本番ドメイン（例: `https://labocale.vercel.app`）を設定します。

### 1-5. 起動

```bash
npm run dev
# http://localhost:3000
```

---

## 2. Vercel へのデプロイ

1. GitHub リポジトリを Vercel に接続（Framework は自動で Next.js を検出）。
2. **Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL` と
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` を登録。
3. Deploy。
4. 発行された本番 / プレビュー URL を、Supabase の **Redirect URLs** に追加（1-4 参照）。

---

## 3. 使い方

- **実験を追加**: ヘッダー右上「＋実験を追加」→ テンプレートを選ぶと、一連のステップが
  待ち時間・装置予約を考慮して一括登録されます。「テンプレを作成」で独自テンプレも作成可能。
- **予定の移動 / 長さ変更**: カレンダー上のブロックをドラッグで移動、下端をドラッグでリサイズ。
- **依存関係**: 予定をクリック → モーダルで「前提タスク」を追加。つないだタスクは失敗時に連動します。
- **失敗 → 自動リスケ**: 予定をクリック →「失敗 → 自動リスケ」。移動プレビューを確認して実行すると、
  後続タスクが装置予約・稼働時間（既定 8:00–20:00・平日）を避けて最も早い空きへ再配置されます。

---

## 4. 開発コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
npm run test       # 自動リスケのユニットテスト (vitest)
```

## 5. 構成メモ

- コアの自動リスケは `lib/reschedule.ts`（DB 非依存の純粋関数、`lib/reschedule.test.ts` で検証）。
- テンプレート展開は `lib/expandTemplate.ts`。
- 時刻計算はブラウザのタイムゾーンに依存せず Asia/Tokyo 固定（`lib/calendar.ts` / `lib/config.ts`）。
- データ取得は `lib/queries.ts`、複合的な書き込み（テンプレ展開・リスケ確定）は `lib/mutations.ts`。
