"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  async function oauth(provider: "google" | "apple") {
    setLoading(provider);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(null);
    }
  }

  async function emailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    setMessage(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "info",
          text: "確認メールを送信しました。メール内のリンクから登録を完了してください。",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        window.location.href = "/";
      }
    }
    setLoading(null);
  }

  return (
    <div className="space-y-5">
      {/* OAuth */}
      <div className="space-y-2.5">
        <button
          onClick={() => oauth("google")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleIcon />
          Google で続ける
        </button>
        <button
          onClick={() => oauth("apple")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          <AppleIcon />
          Apple で続ける
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        または メールアドレス
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Email / Password */}
      <form onSubmit={emailAuth} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={loading !== null}
          className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading === "email"
            ? "処理中…"
            : mode === "signin"
              ? "ログイン"
              : "新規登録"}
        </button>
      </form>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            message.type === "error"
              ? "bg-rose-50 text-rose-600"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <p className="text-center text-sm text-gray-500">
        {mode === "signin" ? "アカウントがありませんか？" : "既に登録済みですか？"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage(null);
          }}
          className="font-semibold text-brand-600 hover:underline"
        >
          {mode === "signin" ? "新規登録" : "ログイン"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.85 9.9C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.9c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.16-3 .9-3.78.9-.77 0-1.97-.88-3.24-.85-1.67.02-3.21.97-4.07 2.46-1.73 3-.44 7.45 1.24 9.89.82 1.19 1.8 2.53 3.08 2.48 1.24-.05 1.7-.8 3.2-.8 1.49 0 1.91.8 3.21.77 1.33-.02 2.17-1.21 2.98-2.41.94-1.38 1.33-2.72 1.35-2.79-.03-.01-2.59-.99-2.62-3.94ZM14.6 5.3c.68-.83 1.14-1.98 1.02-3.13-.98.04-2.17.65-2.87 1.48-.63.73-1.18 1.9-1.03 3.02 1.09.08 2.2-.55 2.88-1.37Z" />
    </svg>
  );
}
