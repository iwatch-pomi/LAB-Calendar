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
            実験プロセスを、
            <br />
            失敗まで見据えて管理する。
          </h1>
          <p className="max-w-md leading-relaxed text-brand-50/90">
            培養・合成など複数日にわたる実験ステップをテンプレートからワンクリック登録。
            共通装置の予約と待ち時間を考慮し、実験失敗時には依存関係に基づいて後続タスクを
            自動で最適な空き日程へ再配置します。
          </p>
          <ul className="space-y-2 text-sm text-brand-50/90">
            <li>・ 実験テンプレートで一連のステップを一括登録</li>
            <li>・ 遠心機 / AKTA など共通装置の予約管理</li>
            <li>・ 失敗時の依存関係に基づく自動リスケ</li>
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
