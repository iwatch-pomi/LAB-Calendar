"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";
import { ThemeRoot } from "./ThemeRoot";
import { DEFAULT_AFTER_LOGIN } from "@/lib/authRedirect";
import { CONTACT_EMAIL } from "@/lib/site";

/** Supabase の最小パスワード長に合わせる（signUp 側と同じ） */
const MIN_LENGTH = 6;

type Phase = "checking" | "ready" | "nosession" | "done";

/**
 * パスワードの再設定。
 *
 * 到達経路は2つある。どちらも「セッションがあれば新しいパスワードを設定できる」
 * という一点に集約している。
 *  1. 再設定メールのリンク → Supabase → /auth/callback がコードを交換して
 *     セッションを張り、cookie に入れておいた行き先でここへ来る
 *  2. ログイン中の人がマイページから直接開く
 *
 * セッションが無い場合（リンクの期限切れ、別ブラウザで開いた、直接URLを叩いた）は
 * 行き止まりにせず、やり直す導線を出す。
 */
export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setPhase(data.session ? "ready" : "nosession");
    });
    return () => {
      alive = false;
    };
  }, []);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= MIN_LENGTH && password === confirm && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes("should be at least")
          ? `パスワードは${MIN_LENGTH}文字以上にしてください。`
          : `変更できませんでした（${err.message}）`,
      );
      return;
    }
    setPhase("done");
  }

  return (
    <ThemeRoot>
      <div className="grid min-h-screen place-items-center bg-[#f6f8fa] p-5 dark:bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="transition hover:opacity-80">
              <Logo size="lg" />
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {phase === "checking" && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                確認しています…
              </p>
            )}

            {phase === "nosession" && (
              <>
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-50 dark:bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="mt-4 text-center text-base font-bold text-gray-800 dark:text-gray-100">
                  リンクが無効か、期限が切れています
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  お手数ですが、もう一度パスワードの再設定をお申し込みください。
                </p>
                <ul className="mt-3 ml-4 list-disc space-y-1 text-xs text-gray-500 marker:text-gray-400 dark:text-gray-400">
                  <li>
                    メール内のリンクは、
                    <strong>申し込んだのと同じブラウザ</strong>
                    で開いてください
                  </li>
                  <li>リンクには有効期限があります</li>
                  <li>リンクは一度しか使えません</li>
                </ul>
                <Link
                  href={`${DEFAULT_AFTER_LOGIN}?login=1`}
                  className="mt-5 block w-full rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  ログイン画面へ
                </Link>
                <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
                  うまくいかない場合は {CONTACT_EMAIL} までご連絡ください。
                </p>
              </>
            )}

            {phase === "ready" && (
              <>
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                  <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h1 className="mt-4 text-center text-base font-bold text-gray-800 dark:text-gray-100">
                  新しいパスワードを設定
                </h1>
                <form onSubmit={submit} className="mt-5 space-y-3">
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={MIN_LENGTH}
                    placeholder={`新しいパスワード（${MIN_LENGTH}文字以上）`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-brand-900/40"
                  />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="確認のためもう一度"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-brand-900/40"
                  />
                  {tooShort && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {MIN_LENGTH}文字以上にしてください。
                    </p>
                  )}
                  {mismatch && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      2つのパスワードが一致しません。
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "変更しています…" : "パスワードを変更する"}
                  </button>
                </form>
                {error && (
                  <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    {error}
                  </p>
                )}
              </>
            )}

            {phase === "done" && (
              <>
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="mt-4 text-center text-base font-bold text-gray-800 dark:text-gray-100">
                  パスワードを変更しました
                </h1>
                <p className="mt-3 text-center text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  次回からは新しいパスワードでログインしてください。
                </p>
                {/* /app へ送れば、教授・指導者はサーバー側で管理画面へ振り替わる */}
                <a
                  href={DEFAULT_AFTER_LOGIN}
                  className="mt-5 block w-full rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  ラボカレを開く
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </ThemeRoot>
  );
}
