import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeRoot } from "./ThemeRoot";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME } from "@/lib/site";

/**
 * 利用規約・プライバシーポリシーの共通の外枠。
 *
 * ダークモードに対応させている（`ThemeRoot`）。公式サイト `/` は常にライト固定の
 * ままだが、この2ページは**設定画面からも開かれる**ため。ダークで使っている人が
 * 設定から規約を開いたときに真っ白な画面が出るほうが体験として悪い。
 */
export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  /** 「2026年8月7日」のような表示用の文字列 */
  updatedAt: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ThemeRoot>
      <div className="min-h-screen bg-[#f6f8fa] dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href="/" className="transition hover:opacity-80">
              <Logo size="sm" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {SITE_NAME}のトップへ
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-10">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h1>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            最終更新日: {updatedAt}
          </p>
          {intro && (
            <div className="mt-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {intro}
            </div>
          )}

          <div className="mt-8 space-y-8">{children}</div>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              お問い合わせ
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              本ページの内容についてのご質問、個人情報の開示・訂正・削除のご請求は、
              下記までご連絡ください。
            </p>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              {OPERATOR_NAME}
              <br />
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              ログイン中の方は、マイページの「お問い合わせ・ご要望」からもご連絡いただけます。
            </p>
          </div>
        </main>
      </div>
    </ThemeRoot>
  );
}

/** 見出し付きの条項。番号は自分で振らず、並べた順に表示する */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
        {heading}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

/** 条項の中の箇条書き */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 marker:text-gray-400">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
