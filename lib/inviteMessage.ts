import type { SharePermission, ShareScope } from "@/lib/types";

/**
 * 未登録の相手に送る招待メールの文面を組み立てる。
 *
 * このアプリにはメール送信基盤が無いので、ユーザー自身のメールソフトを
 * mailto: で開いて送ってもらう。文面の生成をここに切り出しておくことで、
 * 後から自動送信（Resend 等）へ差し替えるときもそのまま使い回せる。
 */

export interface InviteInput {
  /** 招待する相手のメールアドレス */
  toEmail: string;
  /** 送り主の表示名（表示名が無ければメールアドレス） */
  fromLabel: string;
  /** アプリのURL（呼び出し側で window.location.origin を渡す） */
  appUrl: string;
  scope: ShareScope;
  /** scope="experiment" のときのカレンダー名 */
  experimentName?: string | null;
  permission: SharePermission;
}

export interface InviteMessage {
  subject: string;
  body: string;
  /** そのまま <a href> に入れられる mailto: URL */
  mailtoHref: string;
}

export function buildInvite(input: InviteInput): InviteMessage {
  const {
    toEmail,
    fromLabel,
    appUrl,
    scope,
    experimentName,
    permission,
  } = input;

  const what =
    scope === "experiment" && experimentName
      ? `「${experimentName}」の予定`
      : "研究の予定";

  const canDo =
    permission === "comment"
      ? "予定の閲覧と、予定へのコメントができます。"
      : "予定の閲覧ができます。";

  const subject = `【ラボカレ】${fromLabel}さんが${what}を共有しました`;

  // 重要: 招待されたのと同じメールアドレスで登録しないと共有が有効にならない。
  // （claim_share_invitations() がログイン中のメールで招待を引くため）
  const body = [
    `${fromLabel}さんから、研究スケジュール管理アプリ「ラボカレ」で`,
    `${what}が共有されました。`,
    "",
    "▼ 下のリンクを開いて新規登録すると閲覧できます",
    appUrl,
    "",
    `※ 必ずこのメールアドレス（${toEmail}）で登録してください。`,
    "　 別のアドレスで登録すると共有が反映されません。",
    "",
    `登録後にできること: ${canDo}`,
    "予定を書き換えることはできないのでご安心ください。",
    "",
    "──────────",
    "ラボカレ - 理系学生のための実験スケジュール管理",
  ].join("\n");

  const mailtoHref =
    `mailto:${encodeURIComponent(toEmail)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoHref };
}
