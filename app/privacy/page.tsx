import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LegalSection,
  LegalList,
} from "@/components/LegalPage";
import {
  CONTACT_EMAIL,
  OPERATOR_NAME,
  SITE_NAME,
  TERMS_PATH,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: `${SITE_NAME}のプライバシーポリシーです。取得する情報、利用目的、保管場所、削除の求めへの対応について記載しています。`,
  alternates: { canonical: "/privacy" },
};

/** 内容を変えたら必ずここも更新する */
const UPDATED_AT = "2026年8月7日";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="プライバシーポリシー"
      updatedAt={UPDATED_AT}
      intro={
        <p>
          {OPERATOR_NAME}（以下「当運営」）は、スケジュール管理サービス「{SITE_NAME}
          」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおり
          定めます。
        </p>
      }
    >
      <LegalSection heading="1. 事業者">
        <p>
          {OPERATOR_NAME}
          <br />
          連絡先:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="2. 取得する情報">
        <p>本サービスでは、次の情報を取得します。</p>
        <LegalList
          items={[
            <>
              <strong>アカウント情報</strong>: メールアドレス。Google または Apple で
              ログインした場合は、各社から提供されるアカウントの識別情報および
              メールアドレス。
            </>,
            <>
              <strong>プロフィール</strong>: 表示名、アイコン（絵文字と背景色）。
              いずれも任意の入力です。
            </>,
            <>
              <strong>本サービスの利用にともなって作成されるデータ</strong>:
              実験、予定、予定どうしの依存関係、ToDo、使用機器、実験テンプレート、
              培地の記録、共有した予定へのコメントなど。
            </>,
            <>
              <strong>共有・研究室に関する情報</strong>: 誰に何を共有したかの記録、
              研究室とその所属。
            </>,
            <>
              <strong>お問い合わせの内容</strong>: 送信いただいた本文と種別、
              および送信時にログインしていたメールアドレス。
            </>,
            <>
              <strong>表示に関する設定</strong>: 配色（ライト / ダーク）、
              週の開始曜日、活動時間、利用形態（学生 / 教授・指導者）など。
            </>,
          ]}
        />
        <p>
          本サービスは、行動履歴を収集するアクセス解析ツールや広告関連のツールを
          <strong>一切利用していません。</strong>
          閲覧したページや操作の履歴を収集・分析することはありません。
        </p>
      </LegalSection>

      <LegalSection heading="3. 招待機能でお預かりする第三者の情報">
        <p>
          本サービスには、まだ登録していない相手をメールアドレスで招待し、
          カレンダーを共有する機能があります。この場合、
          <strong>
            招待された方のメールアドレスを、招待した利用者から当運営がお預かりして
            保存します。
          </strong>
        </p>
        <p>
          このメールアドレスは、その方が本サービスに登録した際に共有を成立させる
          目的にのみ利用し、他の用途には利用しません。招待の取り消し、または
          保存されたメールアドレスの削除をご希望の場合は、
          招待した利用者による取り消し操作のほか、末尾の連絡先までお申し出ください。
        </p>
        <p>
          招待を行う利用者は、
          <Link
            href={TERMS_PATH}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            利用規約
          </Link>
          第6条のとおり、相手の同意を得たうえで実施してください。
        </p>
      </LegalSection>

      <LegalSection heading="4. 利用目的">
        <LegalList
          items={[
            "本サービスの提供、本人確認およびログイン状態の維持のため",
            "利用者が登録した予定・実験などを表示し、共有相手に見せるため",
            "お問い合わせへの回答および不具合の調査のため",
            "本サービスの不正利用の防止のため",
            "本サービスに関する重要なお知らせを送るため",
          ]}
        />
      </LegalSection>

      <LegalSection heading="5. 第三者提供">
        <p>
          当運営は、次の場合を除き、取得した個人情報を第三者に提供しません。
        </p>
        <LegalList
          items={[
            "ご本人の同意がある場合（利用者ご自身の操作によってカレンダーを他の利用者に共有する場合を含みます）",
            "法令にもとづく場合",
            "人の生命・身体・財産の保護のために必要で、ご本人の同意を得ることが困難な場合",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. 業務の委託と保管場所">
        <p>
          本サービスの運営にあたり、次の外部サービスを利用しています。個人情報の
          取り扱いを委託する場合は、必要かつ適切な監督を行います。
        </p>
        <LegalList
          items={[
            <>
              <strong>Supabase</strong>（Supabase, Inc.）… データベースおよび認証。
              データは<strong>東京リージョン（日本国内）</strong>のサーバーに
              保管しています。
            </>,
            <>
              <strong>Vercel</strong>（Vercel, Inc.）… 本サービスのホスティング。
            </>,
            <>
              <strong>Google</strong>（Google LLC）／<strong>Apple</strong>
              （Apple Inc.）… 「Google で続ける」「Apple で続ける」を選択した場合の
              認証。
            </>,
          ]}
        />
        <p>
          データの保管場所は日本国内ですが、上記の事業者はいずれも外国の法人であり、
          運用・保守の過程で国外から取り扱いが行われる可能性があります。
          各社の個人情報の取り扱いについては、各社が公表する規定をご確認ください。
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookie とブラウザ内の保存領域">
        <p>
          本サービスは、次の目的で Cookie およびブラウザの保存領域
          （ローカルストレージ）を利用します。いずれも
          <strong>本サービスを動作させるためのもので、追跡や広告の目的では利用しません。</strong>
        </p>
        <LegalList
          items={[
            "ログイン状態を保つため（認証に関する Cookie）",
            "ログイン後の遷移先を一時的に覚えておくため（ログインの往復が終わると削除されます）",
            "アカウント登録なしのお試し利用で、作成した予定などを保持するため",
            "配色（ライト / ダーク）、表示モード、サイドバーの開閉といった画面の設定を覚えておくため",
          ]}
        />
        <p>
          Cookie はブラウザの設定で無効にできますが、その場合ログインができなくなるなど、
          本サービスの一部または全部をご利用いただけなくなります。
        </p>
      </LegalSection>

      <LegalSection heading="8. 保存期間">
        <p>
          取得した情報は、本サービスの提供に必要な期間、保存します。アカウントの
          削除をお申し込みいただくと、7日間の猶予期間の後に、そのアカウントに
          紐づく予定・実験・ToDo・設定・お問い合わせの内容などのデータが
          あわせて削除されます。
        </p>
      </LegalSection>

      <LegalSection heading="9. 開示・訂正・削除の求め">
        <p>
          アカウントの削除は、ログイン後の
          <strong>「マイページ」→「アカウントの削除」</strong>
          からご自身で行えます。誤操作からの復帰のため、
          <strong>お申し込みから7日間の猶予期間</strong>
          を設けており、その間は画面上部の「削除を取り消す」からいつでも
          取り消せます。猶予期間を過ぎると、そのアカウントに紐づく実験・予定・
          ToDo・設定・お問い合わせの記録などがあわせて削除され、復元はできません。
        </p>
        <p>
          そのほか、個人情報の開示、訂正、利用停止をご希望の場合や、
          ログインできずに削除ができない場合は、末尾の連絡先までご連絡ください。
          ご本人であることを確認のうえ、法令に従い対応します。
        </p>
      </LegalSection>

      <LegalSection heading="10. 安全管理">
        <p>
          当運営は、個人情報への不正なアクセス、紛失、破壊、改ざん、漏えいを防ぐため、
          通信の暗号化、利用者ごとのアクセス制御などの措置を講じています。ただし、
          インターネットを通じた通信および保管について、完全な安全性を保証するものでは
          ありません。
        </p>
      </LegalSection>

      <LegalSection heading="11. 未成年者の利用">
        <p>
          未成年の方が本サービスをご利用になる場合は、親権者など法定代理人の同意を
          得たうえでご利用ください。
        </p>
      </LegalSection>

      <LegalSection heading="12. 本ポリシーの変更">
        <p>
          当運営は、必要に応じて本ポリシーを変更することがあります。変更後の内容は、
          本ページに掲載した時点から適用されます。取得する情報や利用目的に重要な
          変更を行う場合は、本サービス上でお知らせします。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
