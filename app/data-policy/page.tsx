import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LegalSection,
  LegalList,
} from "@/components/LegalPage";
import {
  CODENAME_EXAMPLES,
  DETAIL_STORAGE_SUGGESTIONS,
  SENSITIVE_CATEGORIES,
} from "@/lib/dataPolicy";
import {
  OPERATOR_NAME,
  PRIVACY_PATH,
  SITE_NAME,
  TERMS_PATH,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "データの取り扱いガイドライン",
  description: `${SITE_NAME}に入力してよい情報と、入力をお控えいただきたい情報の目安です。研究室で安全にお使いいただくための運用のおすすめをまとめています。`,
  alternates: { canonical: "/data-policy" },
};

/** 内容を変えたら必ずここも更新する */
const UPDATED_AT = "2026年10月3日";

export default function DataPolicyPage() {
  return (
    <LegalPage
      title="データの取り扱いガイドライン"
      updatedAt={UPDATED_AT}
      intro={
        <>
          <p>
            {SITE_NAME}は、研究の<strong>予定</strong>
            — いつ、どの実験の、どの操作をするか — を管理するための道具です。
            研究の<strong>中身</strong>（測定値や未公開の結果）を保管する場所としては
            設計していません。
          </p>
          <p className="mt-3">
            情報漏えいに対していちばん確実な備えは、
            <strong>そもそも漏れて困るものを置かないこと</strong>です。
            どんな保存場所を選んでも、機密が入っていれば不安は残りますが、
            入っていなければ最初から困りません。このページでは、
            そのための具体的な目安をまとめています。
          </p>
        </>
      }
    >
      <LegalSection heading="1. 基本の考え方">
        <p>
          カレンダーには「<strong>やったこと・やる予定</strong>
          」だけを書き、「<strong>何が分かったか</strong>
          」は書かない、と切り分けてください。
        </p>
        <LegalList
          items={[
            <>
              <strong>入れてよいもの</strong>: 日付と時刻、所要時間、待ち時間、
              使う装置の名前、担当者、進んだ / 遅れたという状況、
              「測定した」「培地を交換した」といった作業の記録。
            </>,
            <>
              <strong>入れないもの</strong>:
              測定値そのもの、未公開の知見、個人を特定できる情報、
              契約で守られている情報、パスワードなどの認証情報。
            </>,
          ]}
        />
        <p>
          この切り分けを守っていれば、万一データが外部に出ても、
          失われるのは「誰かが何月何日に実験をしていた」という程度の情報にとどまります。
        </p>
      </LegalSection>

      <LegalSection heading="2. 入力をお控えいただきたい情報">
        <p>
          予定名、メモ、カレンダー名、テンプレートの工程名、コメント、
          継代培養の記録など、
          <strong>入力できるすべての欄</strong>が対象です。
        </p>
        <ul className="mt-2 space-y-3">
          {SENSITIVE_CATEGORIES.map((c) => (
            <li
              key={c.label}
              className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {c.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {c.detail}
              </p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading="3. 名前は符号で書く">
        <p>
          予定名やカレンダー名を符号にしておくと、画面を第三者に見られても、
          自分と研究室の人以外には意味が分かりません。対応表は研究室の中だけで
          持っておいてください。
        </p>
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="w-1/2 px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                  避けたい書き方
                </th>
                <th className="w-1/2 px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                  おすすめの書き方
                </th>
              </tr>
            </thead>
            <tbody>
              {CODENAME_EXAMPLES.map((e) => (
                <tr
                  key={e.avoid}
                  className="border-t border-gray-200 align-top dark:border-gray-800"
                >
                  <td className="px-3 py-2.5 text-gray-500 line-through decoration-gray-300 dark:text-gray-400 dark:decoration-gray-600">
                    {e.avoid}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                    {e.instead}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          実験テンプレートの工程名も同じです。テンプレートは研究室で共有されることが
          多いため、そのまま条件が読み取れる名前は避けてください。
        </p>
      </LegalSection>

      <LegalSection heading="4. 詳細はどこに置くか">
        <p>
          カレンダーから外した数値や詳細は、研究室が普段使っている保管場所に
          置いてください。
        </p>
        <LegalList items={DETAIL_STORAGE_SUGGESTIONS} />
        <p>
          予定のメモには「結果は共有フォルダの ○○ を参照」のように
          <strong>置き場所だけ</strong>を書いておくと、両方の利点が得られます。
          このとき、リンク先そのものが誰でも開ける状態になっていないかも
          あわせて確認してください。
        </p>
      </LegalSection>

      <LegalSection heading="5. 共有・研究室の機能を使うとき">
        <LegalList
          items={[
            "共有すると、相手には実験名・予定の内容・ToDo などが表示されます。共有する前に、見られてよい内容になっているか確かめてください。",
            "特定のカレンダーだけを共有する設定もあります。全部を見せる必要がなければ、範囲を絞ってください。",
            "研究室の参加コードは、参加してほしい相手にだけお伝えください。コードを知っている人は誰でも参加できます。",
            "研究室に参加すると、主宰・スタッフがカレンダーを閲覧できます。見せたくない期間は、研究室の画面からいつでも公開を停止できます。",
            "共有は、必要がなくなったら取り消してください。卒業・異動した相手の共有が残り続けないよう、年度の切り替わりに見直すのがおすすめです。",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. 研究室で決めておくとよいこと">
        <p>
          個人の心がけに任せるより、研究室の決まりとして1枚にまとめておくほうが
          確実です。次の4点を決めておけば、ほぼ足ります。
        </p>
        <LegalList
          items={[
            "カレンダーに書いてよい粒度（例: 「実験名は符号、数値は書かない」）",
            "数値や詳細の置き場所（例: 「学内ファイルサーバーの research/ 以下」）",
            "共同研究やNDAのあるテーマの扱い（例: 「テーマ名も符号にする」）",
            "卒業・異動時の手順（共有の取り消し、アカウントの削除、引き継ぎ）",
          ]}
        />
        <p>
          新しく入った学生に最初に渡す資料としてもお使いください。
        </p>
      </LegalSection>

      <LegalSection heading="7. 端末とアカウントの守り方">
        <p>
          実際に起きやすい漏えいは、データベースへの侵入よりも
          <strong>端末とアカウントの側</strong>からです。ここを締めるほうが、
          保存場所を変えるより効果があります。
        </p>
        <LegalList
          items={[
            "研究室の共用パソコンでは、使い終わったらログアウトしてください。ログインしたまま離席すると、次に座った人が中身を見られます。",
            "パスワードを他のサービスと使い回さないでください。他社から流出したパスワードで試されるのが、もっとも多い侵入経路です。",
            "Google・Apple でのログインを使うと、パスワードを新しく覚える必要がなく、二段階認証もそのまま効きます。",
            "画面を投影・配信するときは、カレンダーに他の人の予定が映っていないか確認してください。",
            "端末を紛失・譲渡するときは、ブラウザに保存されたログイン状態を消してください。",
          ]}
        />
      </LegalSection>

      <LegalSection heading="8. 責任の所在">
        <p>
          {OPERATOR_NAME}（以下「当運営」）は、本サービスの安全な運用に努めていますが、
          次の点をあらかじめご了解ください。
        </p>
        <LegalList
          items={[
            <>
              <strong>
                どのような情報を入力するかは、利用者ご自身および所属する研究室の
                判断と責任で決めていただくものです。
              </strong>
              当運営は、入力された内容を点検したり、機密情報かどうかを判定したり
              することはありません。
            </>,
            <>
              <strong>
                当運営は、本サービスに登録されたデータの消失、漏えい、
                第三者による閲覧、およびそれらによって生じた損害について、
                責任を負いません。
              </strong>
              研究の成果に関わる重要な情報の保全は、利用者ご自身の責任で
              行ってください。
            </>,
            <>
              本サービスは<strong>無料</strong>で、現状有姿で提供されます。
              データが常に保持されること、常に利用できることを保証するものでは
              ありません。重要な情報は、本サービスの外にも必ず控えを
              残してください。
            </>,
            <>
              利用者ご自身の操作によって共有した内容、および共有相手による
              取り扱いについて、当運営は責任を負いません。
            </>,
          ]}
        />
        <p>
          詳しい条件は
          <Link
            href={TERMS_PATH}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            利用規約
          </Link>
          （第6条・第11条）に定めています。取得する情報と保管場所については
          <Link
            href={PRIVACY_PATH}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            プライバシーポリシー
          </Link>
          をご覧ください。
        </p>
      </LegalSection>

      <LegalSection heading="9. 学内の規程が優先します">
        <p>
          所属機関の情報セキュリティ規程、研究倫理の審査条件、共同研究の契約、
          個人情報の保護に関する法令などに、本サービスの利用やデータの保存場所に
          ついての定めがある場合は、<strong>それらが優先します</strong>。
          判断に迷う情報は、入力する前に指導教員や所属機関の担当部署へ
          ご確認ください。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
