import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthForm } from "@/components/auth/AuthForm";

/**
 * 教授・指導者向けの入口(/teacher)で、未ログイン時に表示する独立したログイン画面。
 *
 * 教授はカレンダーを使わないため、学生用の CalendarApp は一切マウントしない
 * （AuthModal をカレンダーの上に重ねる従来のパターンはここでは使わない）。
 */
export function TeacherLoginScreen() {
  return (
    <div data-theme-root suppressHydrationWarning>
      <div className="grid min-h-screen place-items-center bg-[#f6f8fa] p-4 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <Link href="/" className="inline-block transition hover:opacity-80">
            <Logo />
          </Link>
          <h1 className="mt-3 text-xl font-bold text-gray-800 dark:text-gray-100">
            教授・指導者の方はこちら
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            共有された学生の予定を閲覧するための管理画面です。自分でカレンダーを作る必要はありません。
          </p>

          <div className="mt-5">
            <AuthForm />
          </div>

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            学生の方は{" "}
            <Link
              href="/app"
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
