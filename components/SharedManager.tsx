"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useExperiments } from "@/lib/queries";
import {
  useMyShares,
  useSharedWithMe,
  useShareByEmail,
  useRevokeShare,
  useVisibleProfiles,
  usePendingInvitations,
  useCancelInvitation,
  profileLabel,
} from "@/lib/sharedQueries";
import { useProfile } from "@/lib/queries";
import { buildInvite } from "@/lib/inviteMessage";
import type {
  SharePermission,
  ShareScope,
  ShareInvitation,
} from "@/lib/types";
import { paletteFor, PALETTE_KEYS } from "@/lib/types";
import {
  ChevronLeft,
  Share2,
  Send,
  Trash2,
  CalendarDays,
  Inbox,
  Users,
  Mail,
  Copy,
  Check,
  MailPlus,
} from "lucide-react";

/**
 * 共有の管理ページ。
 * ・自分のカレンダーを誰に見せているか（作成・取り消し）
 * ・自分が見られる他人のカレンダー一覧
 */
export function SharedManager({ userEmail }: { userEmail: string }) {
  const experimentsQ = useExperiments();
  const mySharesQ = useMyShares();
  const incomingQ = useSharedWithMe();
  const profilesQ = useVisibleProfiles();
  const shareByEmail = useShareByEmail();
  const revoke = useRevokeShare();
  const invitationsQ = usePendingInvitations();
  const cancelInvitation = useCancelInvitation();
  const profileQ = useProfile();

  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<ShareScope>("all");
  const [experimentId, setExperimentId] = useState<string>("");
  const [permission, setPermission] = useState<SharePermission>("comment");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 共有直後に「招待メールを送る」を出すための情報 */
  const [justInvited, setJustInvited] = useState<{
    email: string;
    scope: ShareScope;
    experimentName: string | null;
    permission: SharePermission;
  } | null>(null);

  const invitations = invitationsQ.data ?? [];
  /** 送り主として名乗る名前（表示名が無ければメールアドレス） */
  const fromLabel = profileQ.data?.display_name?.trim() || userEmail;

  const experiments = (experimentsQ.data ?? []).filter((e) => !e.archived);
  const myShares = mySharesQ.data ?? [];
  const incoming = incomingQ.data ?? [];

  const profileById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  const expNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of experimentsQ.data ?? []) m.set(e.id, e.name);
    return m;
  }, [experimentsQ.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    if (scope === "experiment" && !experimentId) {
      setError("共有するカレンダーを選んでください。");
      return;
    }
    setError(null);
    setNotice(null);
    setJustInvited(null);
    try {
      const result = await shareByEmail.mutateAsync({
        email: addr,
        scope,
        experimentId: scope === "experiment" ? experimentId : null,
        permission,
      });
      setEmail("");
      if (result === "shared") {
        setNotice(`${addr} に共有しました。`);
      } else {
        // 相手はまだ登録していない。招待は保存されたが、こちらから
        // 知らせないと相手は気付けないのでメール送信を促す。
        setNotice(null);
        setJustInvited({
          email: addr,
          scope,
          experimentName:
            scope === "experiment"
              ? (expNameById.get(experimentId) ?? null)
              : null,
          permission,
        });
      }
    } catch {
      setError(
        "共有できませんでした。メールアドレスをご確認ください（自分自身には共有できません）。",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            カレンダーへ戻る
          </Link>
          <Link
            href="/lab"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Users className="h-4 w-4" />
            研究室
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800">カレンダーの共有</h1>
          <p className="mt-1 text-sm text-gray-500">
            教授・先輩・共同研究者にカレンダーを見せて、進捗を共有できます。相手が編集することはできません。
          </p>
        </div>

        {/* 自分が見られるカレンダー（教授が学生の予定を見に来る主目的なので先頭に置く） */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Inbox className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              自分が見られるカレンダー
            </h2>
            <span className="text-xs text-gray-400">{incoming.length}</span>
          </div>

          {incomingQ.isLoading ? (
            <p className="py-3 text-center text-xs text-gray-400">読み込み中…</p>
          ) : incoming.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">
              共有されているカレンダーはありません。
            </p>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((ownerId) => {
                const label = profileById.get(ownerId) ?? "不明なユーザー";
                const pal = paletteFor(PALETTE_KEYS[0]);
                return (
                  <div
                    key={ownerId}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${pal.bg} ${pal.text}`}
                    >
                      {(label[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {label}
                    </span>
                    <Link
                      href={`/shared/${ownerId}`}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      開く
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 共有する */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">共有する</h2>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              相手のメールアドレス
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prof@example.ac.jp"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-gray-600">
                共有する範囲
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ShareScope)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="all">すべての予定</option>
                  <option value="experiment">特定のカレンダーだけ</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-gray-600">
                相手ができること
                <select
                  value={permission}
                  onChange={(e) =>
                    setPermission(e.target.value as SharePermission)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="comment">閲覧＋コメント</option>
                  <option value="view">閲覧のみ</option>
                </select>
              </label>
            </div>

            {scope === "experiment" && (
              <label className="block text-xs font-semibold text-gray-600">
                共有するカレンダー
                <select
                  value={experimentId}
                  onChange={(e) => setExperimentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-brand-500"
                >
                  <option value="">選択してください</option>
                  {experiments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="submit"
              disabled={shareByEmail.isPending || !email.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {shareByEmail.isPending ? "共有中…" : "共有する"}
            </button>
          </form>

          {notice && (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              {notice}
            </p>
          )}
          {justInvited && (
            <InvitePrompt
              email={justInvited.email}
              fromLabel={fromLabel}
              scope={justInvited.scope}
              experimentName={justInvited.experimentName}
              permission={justInvited.permission}
            />
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </section>

        {/* 招待中（相手がまだ登録していない） */}
        {invitations.length > 0 && (
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-1.5">
              <MailPlus className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">招待中</h2>
              <span className="text-xs text-gray-400">
                {invitations.length}
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              相手がまだ登録していません。招待メールを送って、
              <span className="font-medium">同じメールアドレス</span>
              で登録してもらうと自動的に共有されます。
            </p>

            <div className="space-y-1.5">
              {invitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  fromLabel={fromLabel}
                  experimentName={
                    inv.experiment_id
                      ? (expNameById.get(inv.experiment_id) ?? null)
                      : null
                  }
                  onCancel={() => {
                    if (confirm(`${inv.email} への招待を取り消しますか？`))
                      cancelInvitation.mutate(inv.id);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* 共有中 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">共有中</h2>
            <span className="text-xs text-gray-400">{myShares.length}</span>
          </div>

          {myShares.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">
              まだ誰にも共有していません。
            </p>
          ) : (
            <div className="space-y-1.5">
              {myShares.map((s) => {
                const who = s.grantee_user_id
                  ? (profileById.get(s.grantee_user_id) ?? "不明なユーザー")
                  : "研究室";
                const what =
                  s.scope === "all"
                    ? "すべての予定"
                    : `${expNameById.get(s.experiment_id ?? "") ?? "（削除されたカレンダー）"} のみ`;
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {who}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
                      {what}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
                      {s.permission === "comment" ? "閲覧＋コメント" : "閲覧のみ"}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`${who} への共有を取り消しますか？`))
                          revoke.mutate(s.id);
                      }}
                      title="共有を取り消す"
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

/** メールソフトを開くボタンと、本文コピーのフォールバック */
function useInviteActions(args: {
  email: string;
  fromLabel: string;
  scope: ShareScope;
  experimentName: string | null;
  permission: SharePermission;
}) {
  const [copied, setCopied] = useState(false);

  // アプリのURLは実際にアクセスしているドメインをそのまま使う。
  // レンダー中に window を読むと、SSR時の空文字がハイドレーション後も
  // href に残ってしまい「リンクの無い招待メール」ができるので、
  // マウント後に state 経由で入れて確実に再レンダーさせる。
  const [appUrl, setAppUrl] = useState("");
  useEffect(() => setAppUrl(window.location.origin), []);

  const invite = buildInvite({
    toEmail: args.email,
    fromLabel: args.fromLabel,
    appUrl,
    scope: args.scope,
    experimentName: args.experimentName,
    permission: args.permission,
  });

  function copy() {
    const text = `${invite.subject}\n\n${invite.body}`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }

  return { invite, copied, copy };
}

/** 共有直後に出す「招待メールを送る」案内 */
function InvitePrompt({
  email,
  fromLabel,
  scope,
  experimentName,
  permission,
}: {
  email: string;
  fromLabel: string;
  scope: ShareScope;
  experimentName: string | null;
  permission: SharePermission;
}) {
  const { invite, copied, copy } = useInviteActions({
    email,
    fromLabel,
    scope,
    experimentName,
    permission,
  });

  return (
    <div className="mt-3 rounded-lg bg-brand-50 px-3 py-3 text-xs text-brand-800">
      <p className="mb-2 leading-relaxed">
        <span className="font-semibold">{email}</span>{" "}
        はまだ登録がないため、招待として保存しました。
        <br />
        このままでは相手に伝わらないので、招待メールを送ってください。
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={invite.mailtoHref}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
        >
          <Mail className="h-3.5 w-3.5" />
          招待メールを送る
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "コピーしました" : "本文をコピー"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-brand-700/80">
        ※ ボタンを押すと、いつものメールソフトが件名・本文入りで開きます。
        開かない場合は「本文をコピー」から貼り付けて送ってください。
      </p>
    </div>
  );
}

/** 「招待中」一覧の1行（再送・取り消し） */
function InvitationRow({
  invitation,
  fromLabel,
  experimentName,
  onCancel,
}: {
  invitation: ShareInvitation;
  fromLabel: string;
  experimentName: string | null;
  onCancel: () => void;
}) {
  const { invite, copied, copy } = useInviteActions({
    email: invitation.email,
    fromLabel,
    scope: invitation.scope,
    experimentName,
    permission: invitation.permission,
  });

  const what =
    invitation.scope === "all"
      ? "すべての予定"
      : `${experimentName ?? "（削除されたカレンダー）"} のみ`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
        {invitation.email}
      </span>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
        {what}
      </span>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200">
        {invitation.permission === "comment" ? "閲覧＋コメント" : "閲覧のみ"}
      </span>
      <a
        href={invite.mailtoHref}
        title="招待メールを送る"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
      >
        <Mail className="h-3.5 w-3.5" />
        メール
      </a>
      <button
        onClick={copy}
        title="本文をコピー"
        className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-brand-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        onClick={onCancel}
        title="招待を取り消す"
        className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-rose-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
