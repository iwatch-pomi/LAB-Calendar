# supabase/email-templates/ — 認証メールの文面

Supabase CLI は使いません。**ダッシュボード → Authentication → Email Templates に
貼り付ける**だけです。`supabase/sql/` と同じ運用で、貼り付ける前の原本をここに置きます。

| ファイル | 貼り付け先のテンプレート | 件名 |
|---|---|---|
| [`confirm-signup.html`](confirm-signup.html) | Confirm signup | 【ラボカレ】メールアドレスのご確認 |
| [`reset-password.html`](reset-password.html) | Reset Password | 【ラボカレ】パスワード再設定のご案内 |

この2つだけがアプリから実際に送られます。

- Confirm signup … `AuthForm` の新規登録（`signUp`）
- Reset Password … `AuthForm` の「パスワードをお忘れですか？」（`resetPasswordForEmail`）

Magic Link / Invite user / Change Email Address / Reauthentication は、現在アプリが
使っていないので既定のままで構いません。

---

## 書き換えるときの注意

**`{{ .ConfirmationURL }}` は書き換えないでください。** Supabase が差し込む
確認用URLです。独自にクエリを足すと、Supabase の Redirect URLs の許可リストと
一致しなくなり、公式サイトへ飛ばされます。

**「同じブラウザで開いてください」の一文を消さないでください。** 認証は PKCE で、
申し込んだブラウザに残る値とリンクが対になっています。別のブラウザで開くと必ず
失敗します。これはアプリ側では救済できないので、メールで先に伝えるしかありません。

`reset-password.html` の注意書きは `components/ResetPasswordForm.tsx` の
リンク切れ画面とそろえてあります。片方を直したら、もう片方も直してください。

## 送信元について

送信元を `@labcale.com` にするには、Supabase の組み込みメールではなく
**カスタムSMTP**が要ります（Project Settings → Authentication → SMTP Settings）。
組み込みのままだと Supabase のドメインから送られ、送信数も厳しく制限されます。

`noreply@labcale.com` のような受信できないアドレスを送信元にする場合は、
返信が届かないので、本文のお問い合わせ先を必ず生きているアドレスにしてください。
