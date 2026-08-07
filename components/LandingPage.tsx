import Link from "next/link";
import { Logo } from "./Logo";
import {
  FAQ,
  SITE_NAME,
  TERMS_PATH,
  PRIVACY_PATH,
  CONTACT_EMAIL,
} from "@/lib/site";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  GraduationCap,
  LayoutTemplate,
  ListChecks,
  Palette,
  Share2,
  Sprout,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: LayoutTemplate,
    title: "テンプレートから予定を一括登録",
    body: "実験のステップをテンプレートに登録しておけば、開始日を決めるだけで一連の予定をカレンダーへまとめて配置できます。毎回ひとつずつ入力する必要はありません。",
  },
  {
    icon: Palette,
    title: "実験ごとに色分けしたカレンダー",
    body: "複数の実験を並行して進めても、カレンダーを分けて色で管理できます。名前をクリックすればその実験の予定だけを目立たせて確認できます。",
  },
  {
    icon: Archive,
    title: "終わった実験はアーカイブ",
    body: "終了した実験は普段の画面から片付けられます。アーカイブした実験はあとから見返せて、必要になれば復元もできます。",
  },
  {
    icon: ListChecks,
    title: "ToDoリストも中に",
    body: "「培地を準備する」「装置の予約を確定する」といった細かい作業も同じ画面で管理できます。期限を付けられ、完了した分は記録として残ります。",
  },
  {
    icon: Sprout,
    title: "分野に合わせたツール",
    body: "継代培養の系統（継代ツリー）を記録するツールなどを用意しています。必要な人だけが使えるようON / OFFを切り替えられ、今後も追加していきます。",
  },
  {
    icon: Share2,
    title: "共有して進捗を報告",
    body: "教授・先輩・共同研究者にカレンダーを共有して進捗を報告できます。相手は閲覧とコメントのみで、予定を書き換えられることはありません。",
  },
];

/**
 * 公式サイト（`/`）。
 *
 * 検索から来た人が最初に見るページなので、認証を一切見ない静的な
 * サーバーコンポーネントにして表示を速く保つ。ログイン状態による出し分けは
 * せず、遷移先（/app と /teacher）が両方とも正しく動くようにしてある。
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5">
          <Logo size="sm" themed={false} />
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/teacher"
              className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 sm:px-3"
            >
              <span className="sm:hidden">教授の方</span>
              <span className="hidden sm:inline">教授・指導者の方</span>
            </Link>
            <Link
              href="/app"
              className="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-600 sm:px-3.5"
            >
              使ってみる
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="bg-[#f6f8fa] px-5 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              理系学生の卒業研究のために
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              実験の予定を、
              <br className="sm:hidden" />
              実験の進み方どおりに管理する
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
              {SITE_NAME}
              は、卒業研究のスケジュール管理に特化したカレンダーです。
              実験テンプレートから予定をまとめて登録でき、教授や先輩への進捗報告も
              そのまま行えます。
            </p>

            {/* 2つの入口 */}
            <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <Link
                href="/app"
                className="group rounded-2xl border-2 border-brand-500 bg-brand-500 p-4 text-left transition hover:bg-brand-600"
              >
                <div className="mb-1.5 flex items-center gap-2 text-white">
                  <GraduationCap className="h-5 w-5" />
                  <span className="text-sm font-bold">学生の方</span>
                </div>
                <p className="mb-2.5 text-xs leading-relaxed text-brand-50">
                  自分の実験カレンダーを作る
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                  登録なしで試す
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href="/teacher"
                className="group rounded-2xl border-2 border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="mb-1.5 flex items-center gap-2 text-gray-800">
                  <Users className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-bold">教授・指導者の方</span>
                </div>
                <p className="mb-2.5 text-xs leading-relaxed text-gray-500">
                  学生の予定をまとめて確認する
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                  管理画面へ
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              無料でお使いいただけます。学生の方は登録しなくてもそのまま試せます。
            </p>
          </div>
        </section>

        {/* 課題 */}
        <section className="px-5 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
              研究の予定は、普通のカレンダーだと合わない
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                "実験は何日にもまたがるのに、1件ずつ手で入力している",
                "培養や反応の待ち時間、装置の空きまで考えて組むのが大変",
                "進捗を聞かれるたびに、口頭やメールで説明し直している",
              ].map((t) => (
                <div
                  key={t}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 機能 */}
        <section className="bg-[#f6f8fa] px-5 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
              ラボカレでできること
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-brand-50">
                      <Icon className="h-4 w-4 text-brand-600" />
                    </span>
                    <h3 className="mb-1 text-sm font-bold text-gray-800">
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-600">
                      {f.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 立場別 */}
        <section className="px-5 py-14">
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-600" />
                <h2 className="text-base font-bold text-gray-900">学生の方へ</h2>
              </div>
              <ul className="space-y-2">
                {[
                  "テンプレートから実験の予定を一括で登録",
                  "実験ごとに色分けしたカレンダーで並行管理",
                  "ToDoと合わせて細かい作業まで一元管理",
                  "教授・先輩に共有して、報告の手間を減らす",
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/app"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <CalendarDays className="h-4 w-4" />
                カレンダーを試す
              </Link>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <h2 className="text-base font-bold text-gray-900">
                  教授・指導者の方へ
                </h2>
              </div>
              <ul className="space-y-2">
                {[
                  "自分でカレンダーを作る必要はありません",
                  "共有された学生の予定を一覧からすぐ開ける",
                  "研究室を作れば、参加コードを配るだけ",
                  "閲覧とコメントのみ。学生の予定は書き換わりません",
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/teacher"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                管理画面へ
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ（構造化データと同じ内容を必ず画面にも出す） */}
        <section className="bg-[#f6f8fa] px-5 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
              よくある質問
            </h2>
            <div className="mt-7 space-y-2.5">
              {FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <h3 className="mb-1.5 text-sm font-bold text-gray-800">
                    {f.q}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 末尾CTA */}
        <section className="px-5 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              まずは触ってみてください
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              デモデータが入った状態で開くので、登録しなくても使い心地を試せます。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                登録なしで試す
              </Link>
              <Link
                href="/teacher"
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                教授・指導者の方はこちら
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-5 py-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Logo size="sm" themed={false} />
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <Link
                href={TERMS_PATH}
                className="text-gray-500 transition hover:text-gray-800"
              >
                利用規約
              </Link>
              <Link
                href={PRIVACY_PATH}
                className="text-gray-500 transition hover:text-gray-800"
              >
                プライバシーポリシー
              </Link>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-gray-500 transition hover:text-gray-800"
              >
                お問い合わせ
              </a>
            </nav>
          </div>
          <p className="mt-5 text-xs text-gray-400">
            卒業研究のスケジュール管理アプリ
          </p>
        </div>
      </footer>
    </div>
  );
}
