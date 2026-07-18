import { Logo } from "@/components/Logo";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 左: ブランド紹介 */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-12 text-white lg:flex">
        <Logo size="lg" />
        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-snug">
            実験時間も、装置の待ち時間も、完璧に管理
          </h1>
          <p className="max-w-md leading-relaxed text-brand-50/90">
            理系学生・大学院生の卒業研究に特化した、実験管理ツール
          </p>
          <ul className="space-y-2 text-sm text-brand-50/90">
            <li>・ 実験テンプレートで一連のステップを一括登録</li>
            <li>・ 実験Todoも管理</li>
            <li>・ あとから見返しやすい記録</li>
          </ul>
        </div>
        <p className="text-xs text-brand-50/60">
          © {new Date().getFullYear()} ラボカレ
        </p>
      </div>

      {/* 右: 認証フォーム */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Logo size="lg" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ログイン</h2>
            <p className="mt-1 text-sm text-gray-500">
              卒研スケジュールを始めましょう
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
