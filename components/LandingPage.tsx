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
  Share2,
  Sprout,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * カード内の図版
 *
 * スクリーンショットを貼らずに、実際の画面を思わせる図をマークアップで
 * 組み立てている。画像を置かないので追加の読み込みが発生せず、拡大しても
 * 潰れない。文言を直したときに図だけ古いまま残る、という事故も起きない。
 *
 * どれも装飾なので aria-hidden にして読み上げから外す。
 * ------------------------------------------------------------------ */

/** 実験ごとに色分けされた週表示のミニチュア */
function CalendarMock() {
  const days = ["月", "火", "水", "木", "金", "土", "日"];
  // start は 1〜7（グリッドの列番号）、span は日数
  const bars = [
    {
      start: 1,
      span: 3,
      label: "前培養",
      cls: "border-teal-300 bg-teal-100 text-teal-800",
    },
    {
      start: 4,
      span: 3,
      label: "本培養",
      cls: "border-violet-300 bg-violet-100 text-violet-800",
    },
    {
      start: 2,
      span: 4,
      label: "SDS-PAGE",
      cls: "border-amber-300 bg-amber-100 text-amber-800",
    },
    {
      start: 5,
      span: 2,
      label: "観察",
      cls: "border-sky-300 bg-sky-100 text-sky-800",
    },
  ];

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {days.map((d, i) => (
          <div
            key={d}
            className={`py-1.5 text-center text-[10px] font-medium ${
              i >= 5 ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="relative space-y-1.5 px-1.5 py-2.5">
        {/* 縦の罫線。バーの下に敷いて、実際のカレンダーらしく見せる。
            左右は親の px-1.5 と揃える（inset-0 にするとバーと6pxずれる） */}
        <div className="pointer-events-none absolute inset-y-0 left-1.5 right-1.5 grid grid-cols-7">
          {days.map((d, i) => (
            <div
              key={d}
              className={i === 0 ? "" : "border-l border-gray-100"}
            />
          ))}
        </div>
        {bars.map((b) => (
          <div key={b.label} className="relative grid grid-cols-7">
            <div
              style={{ gridColumn: `${b.start} / span ${b.span}` }}
              className={`truncate rounded-md border px-1.5 py-1 text-[10px] font-medium ${b.cls}`}
            >
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** テンプレートのステップ入力欄のミニチュア（右端を意図的に見切れさせる） */
function TemplateMock() {
  const steps = [
    { n: 1, name: "前培養", len: "1日" },
    { n: 2, name: "本培養", len: "2日" },
    { n: 3, name: "回収・破砕", len: "半日" },
    { n: 4, name: "精製", len: "1日" },
  ];
  return (
    <div aria-hidden className="space-y-1.5">
      {steps.map((s, i) => (
        <div
          key={s.n}
          className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 ${
            i >= 2 ? "opacity-50" : ""
          }`}
        >
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-gray-100 text-[9px] font-semibold text-gray-500">
            {s.n}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-gray-700">
            {s.name}
          </span>
          <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
            {s.len}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 共有相手の一覧のミニチュア */
function ShareMock() {
  const people = [
    { initial: "田", name: "田中 教授", cls: "bg-brand-500" },
    { initial: "佐", name: "佐藤 先輩", cls: "bg-violet-500" },
    { initial: "鈴", name: "鈴木 さん", cls: "bg-amber-500" },
  ];
  return (
    <div aria-hidden className="space-y-1.5">
      {people.map((p, i) => (
        <div
          key={p.name}
          className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 ${
            i === 2 ? "opacity-50" : ""
          }`}
        >
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ${p.cls}`}
          >
            {p.initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-gray-700">
            {p.name}
          </span>
          <span className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
            閲覧のみ
          </span>
        </div>
      ))}
    </div>
  );
}

/** 2段目の小さいカード */
const SUB_FEATURES = [
  {
    icon: ListChecks,
    title: "ToDoリストも同じ画面に",
    body: "「培地を準備する」「装置の予約を確定する」といった細かい作業も一緒に管理できます。期限を付けられ、完了した分は記録として残ります。",
  },
  {
    icon: Archive,
    title: "終わった実験はアーカイブ",
    body: "終了した実験は普段の画面から片付けられます。アーカイブした実験はあとから見返せて、必要になれば復元もできます。",
  },
  {
    icon: Sprout,
    title: "分野に合わせたツール",
    body: "継代培養の系統を記録するツールなどを用意しています。必要な人だけが使えるようON / OFFを切り替えられ、今後も追加していきます。",
  },
];

/**
 * 公式サイト（`/`）。
 *
 * 検索から来た人が最初に見るページなので、認証を一切見ない静的な
 * サーバーコンポーネントにして表示を速く保つ。ログイン状態による出し分けは
 * せず、遷移先（/app と /teacher）が両方とも正しく動くようにしてある。
 *
 * ダークモードには追従させない。テーマの設定はログイン後の画面のためのもので、
 * 公式サイトは誰が見ても同じ見た目にする（Logo に themed={false} を渡すのも
 * このため）。
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー。スクロールしても入口が常に見えるよう固定する */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <Link href="/" className="rounded-lg">
            <Logo size="sm" themed={false} />
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {[
              { href: "#features", label: "機能" },
              { href: "#audience", label: "使う人" },
              { href: "#faq", label: "よくある質問" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <Link
              href="/teacher"
              className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span className="sm:hidden">教授の方</span>
              <span className="hidden sm:inline">教授・指導者の方</span>
            </Link>
            <Link
              href="/app"
              className="whitespace-nowrap rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              使ってみる
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ヒーロー。見出しは左、説明は右に置く非対称の構成 */}
        <section className="px-5 pb-16 pt-16 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-14">
              <div>
                <h1 className="text-[26px] font-bold leading-[1.3] tracking-tight text-gray-900 sm:text-4xl lg:text-[42px] xl:text-[44px]">
                  卒業研究に最適化された、
                  <br />
                  <span className="text-brand-500">研究カレンダー</span>
                </h1>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/app"
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    登録なしで試す
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/teacher"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    教授・指導者の方
                  </Link>
                </div>
              </div>

              <div className="lg:pt-3">
                <p className="text-base leading-relaxed text-gray-600 sm:text-lg">
                  {SITE_NAME}
                  は、卒業研究のスケジュール管理に特化したカレンダーです。
                </p>
                <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
                  実験テンプレートからの一括登録、ToDo、継代培養の記録、
                  そして教授や先輩への進捗共有まで。
                </p>
                <p className="mt-5 text-sm text-gray-500">
                  すべて無料です。学生の方は登録しなくてもそのまま試せます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 主要機能。1枚目を2列ぶんに広げて、単調な格子にしない */}
        <section id="features" className="scroll-mt-16 px-5 pb-14">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. カレンダー（ワイド） */}
            <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 sm:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <h2 className="text-base font-bold text-gray-900">
                  実験カレンダー
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                複数の実験を<strong className="font-semibold text-gray-900">並行して</strong>
                進めても、実験ごとに色を分けて管理できます。
                何日にもまたがる工程も、そのままの長さで置けます。
              </p>

              <div className="my-5">
                <CalendarMock />
              </div>

              <ul className="mt-auto space-y-1.5">
                {[
                  "実験ごとに色分け",
                  "ドラッグで日程を変更",
                  "依存関係から後工程を自動でずらす",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </article>

            {/* 2. テンプレート */}
            <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-gray-500" />
                <h2 className="text-base font-bold text-gray-900">
                  実験テンプレート
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                実験のステップを登録しておけば、
                <strong className="font-semibold text-gray-900">
                  開始日を決めるだけ
                </strong>
                で一連の予定をまとめて配置できます。
              </p>
              <div className="mt-5">
                <TemplateMock />
              </div>
            </article>

            {/* 3. 共有 */}
            <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-gray-500" />
                <h2 className="text-base font-bold text-gray-900">
                  共有と研究室
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                教授・先輩に共有して進捗を報告できます。相手は
                <strong className="font-semibold text-gray-900">
                  閲覧とコメントのみ
                </strong>
                で、予定は書き換わりません。
              </p>
              <div className="mt-5">
                <ShareMock />
              </div>
            </article>

            {/* 2段目 */}
            {SUB_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <h2 className="text-base font-bold text-gray-900">
                      {f.title}
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {f.body}
                  </p>
                </article>
              );
            })}

            {/* 2段目を3枚にすると4列目が空くので、そこは行き先として使う */}
            <article className="flex flex-col justify-between rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  まずは触ってみてください
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  デモデータが入った状態で開きます。登録は要りません。
                </p>
              </div>
              <Link
                href="/app"
                className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700"
              >
                カレンダーを開く
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </article>
          </div>
        </section>

        {/* 課題 */}
        <section className="border-y border-gray-200 bg-[#f8f9fb] px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              研究の予定は、普通のカレンダーだと合わない
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                "実験は何日にもまたがるのに、1件ずつ手で入力している",
                "培養や反応の待ち時間、装置の空きまで考えて組むのが大変",
                "進捗を聞かれるたびに、口頭やメールで説明し直している",
              ].map((t) => (
                <p
                  key={t}
                  className="border-l-2 border-gray-300 pl-4 text-sm leading-relaxed text-gray-600"
                >
                  {t}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* 立場別 */}
        <section id="audience" className="scroll-mt-16 px-5 py-14">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-bold text-gray-900">学生の方へ</h2>
              </div>
              <ul className="space-y-2.5">
                {[
                  "テンプレートから実験の予定を一括で登録",
                  "実験ごとに色分けしたカレンダーで並行管理",
                  "ToDoと合わせて細かい作業まで一元管理",
                  "教授・先輩に共有して、報告の手間を減らす",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/app"
                className="mt-6 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <CalendarDays className="h-4 w-4" />
                カレンダーを試す
              </Link>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  教授・指導者の方へ
                </h2>
              </div>
              <ul className="space-y-2.5">
                {[
                  "自分でカレンダーを作る必要はありません",
                  "共有された学生の予定を一覧からすぐ開ける",
                  "研究室を作れば、参加コードを配るだけ",
                  "閲覧とコメントのみ。学生の予定は書き換わりません",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/teacher"
                className="mt-6 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                管理画面へ
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ（構造化データと同じ内容を必ず画面にも出す） */}
        <section
          id="faq"
          className="scroll-mt-16 border-t border-gray-200 bg-[#f8f9fb] px-5 py-14"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              よくある質問
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <h3 className="mb-1.5 text-sm font-bold text-gray-900">
                    {f.q}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 末尾CTA */}
        <section className="px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              研究の予定を、
              <span className="text-brand-500">実験どおりに</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
              デモデータが入った状態で開くので、登録しなくても使い心地を試せます。
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="group inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                登録なしで試す
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
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

      <footer className="border-t border-gray-200 px-5 py-8">
        <div className="mx-auto max-w-6xl">
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
          <p className="mt-6 text-xs text-gray-400">
            卒業研究のスケジュール管理アプリ
          </p>
        </div>
      </footer>
    </div>
  );
}
