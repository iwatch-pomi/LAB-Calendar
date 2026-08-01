"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useMyLabs,
  useLabMembers,
  useCreateLab,
  useJoinLab,
  useSetLabShare,
  useLeaveLab,
  useDeleteLab,
  useVisibleProfiles,
  useMyUserId,
  profileLabel,
} from "@/lib/sharedQueries";
import { paletteFor, PALETTE_KEYS, type LabRole } from "@/lib/types";
import {
  ChevronLeft,
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserMinus,
  CalendarDays,
  Trash2,
} from "lucide-react";

/**
 * 失敗の理由を画面に出すための補助。
 * 「作成できませんでした」だけだと、SQL の未適用なのか権限なのか
 * 区別が付かず調べようがないので、サーバーからのメッセージを添える。
 */
function detail(e: unknown): string {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? String((e as { message: unknown }).message)
      : "";
  return msg ? `（${msg}）` : "";
}

const ROLE_LABEL: Record<LabRole, string> = {
  owner: "主宰",
  staff: "スタッフ",
  student: "メンバー",
};

/**
 * 研究室ページ。
 * ・教授（主宰）は研究室を作り、参加コードを配り、メンバーのカレンダーを開ける
 * ・学生は参加コードで参加し、自分のカレンダーを見せるかどうかを切り替えられる
 */
export function LabManager({ userEmail }: { userEmail: string }) {
  const labsQ = useMyLabs();
  const meQ = useMyUserId();
  const profilesQ = useVisibleProfiles();
  const createLab = useCreateLab();
  const joinLab = useJoinLab();
  const setShare = useSetLabShare();
  const leaveLab = useLeaveLab();
  const deleteLab = useDeleteLab();

  const labs = labsQ.data ?? [];
  const me = meQ.data ?? null;

  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const activeLab = selectedLab ?? labs[0]?.id ?? null;
  const membersQ = useLabMembers(activeLab);
  const members = membersQ.data ?? [];

  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof profileLabel>>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  const myMembership = members.find((m) => m.user_id === me);
  const iManage =
    myMembership?.role === "owner" || myMembership?.role === "staff";

  const lab = labs.find((l) => l.id === activeLab) ?? null;

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const id = await createLab.mutateAsync(name);
      setNewName("");
      if (id) setSelectedLab(id);
    } catch (e) {
      setError(`研究室を作成できませんでした。${detail(e)}`);
    }
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setError(null);
    try {
      const id = await joinLab.mutateAsync(code);
      setJoinCode("");
      if (id) setSelectedLab(id);
    } catch (e) {
      setError(
        `参加できませんでした。参加コードをご確認ください。${detail(e)}`,
      );
    }
  }

  async function requestDeleteLab() {
    if (!lab) return;
    if (
      !confirm(
        `「${lab.name}」を削除しますか？\nメンバー全員がこの研究室から外れ、この研究室宛ての共有も解除されます。この操作は取り消せません。`,
      )
    )
      return;
    setError(null);
    try {
      await deleteLab.mutateAsync(lab.id);
      setSelectedLab(null);
    } catch (e) {
      setError(`研究室を削除できませんでした。${detail(e)}`);
    }
  }

  function copyCode() {
    if (!lab) return;
    navigator.clipboard?.writeText(lab.invite_code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
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
            href="/shared"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            共有の管理
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800">研究室</h1>
          <p className="mt-1 text-sm text-gray-500">
            研究室に参加すると、主宰・スタッフがメンバーのカレンダーを見られるようになります（閲覧のみ）。
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </p>
        )}

        {labsQ.isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            読み込み中…
          </div>
        )}

        {/* 研究室が無いとき: 作る / 参加する */}
        {labs.length === 0 && !labsQ.isLoading && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <form
              onSubmit={submitCreate}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  研究室を作る
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                学生に配る参加コードが発行されます。
              </p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 分子生物学研究室"
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={createLab.isPending || !newName.trim()}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {createLab.isPending ? "作成中…" : "作成する"}
              </button>
            </form>

            <form
              onSubmit={submitJoin}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  参加コードで参加
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                研究室の主宰からコードを受け取ってください。
              </p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="例: 5A2C9F1B"
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={joinLab.isPending || !joinCode.trim()}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {joinLab.isPending ? "参加中…" : "参加する"}
              </button>
            </form>
          </div>
        )}

        {/* 研究室の切り替え */}
        {labs.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {labs.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLab(l.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  l.id === activeLab
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}

        {/* メンバー一覧 */}
        {lab && (
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">
                  {lab.name}
                </h2>
                <span className="text-xs text-gray-400">{members.length}人</span>
              </div>
              <div className="flex items-center gap-2">
                {iManage && (
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-brand-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    参加コード:{" "}
                    <span className="font-mono tracking-widest">
                      {lab.invite_code}
                    </span>
                  </button>
                )}
                {myMembership?.role === "owner" && (
                  <button
                    onClick={requestDeleteLab}
                    disabled={deleteLab.isPending}
                    title="研究室を削除する"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    削除
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {members.map((m) => {
                const isMe = m.user_id === me;
                const label = isMe
                  ? `${profileById.get(m.user_id) ?? userEmail}（自分）`
                  : (profileById.get(m.user_id) ?? "不明なユーザー");
                const pal = paletteFor(PALETTE_KEYS[0]);
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${pal.bg} ${pal.text}`}
                    >
                      {(label[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {label}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200">
                      {ROLE_LABEL[m.role]}
                    </span>

                    {/* 自分の行: カレンダーを見せるかの切り替え */}
                    {isMe && m.role === "student" && (
                      <button
                        onClick={() =>
                          setShare.mutate({
                            id: m.id,
                            share: !m.share_calendar,
                          })
                        }
                        title={
                          m.share_calendar
                            ? "研究室に公開中。クリックで非公開にします"
                            : "非公開。クリックで公開します"
                        }
                        className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                          m.share_calendar
                            ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {m.share_calendar ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {m.share_calendar ? "公開中" : "非公開"}
                      </button>
                    )}

                    {/* 管理者: 他メンバーのカレンダーを開く */}
                    {iManage && !isMe && m.share_calendar && (
                      <Link
                        href={`/shared/${m.user_id}`}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-600"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        カレンダー
                      </Link>
                    )}
                    {iManage && !isMe && !m.share_calendar && (
                      <span className="shrink-0 text-[11px] text-gray-400">
                        非公開
                      </span>
                    )}

                    {/* 退会（自分） / メンバーを外す（管理者） */}
                    {(isMe || iManage) && m.role !== "owner" && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              isMe
                                ? `「${lab.name}」から退会しますか？`
                                : `${label} を研究室から外しますか？`,
                            )
                          )
                            leaveLab.mutate(m.id);
                        }}
                        title={isMe ? "退会する" : "メンバーを外す"}
                        className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-rose-500"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && !membersQ.isLoading && (
                <p className="py-4 text-center text-xs text-gray-400">
                  メンバーがいません。
                </p>
              )}
            </div>
          </section>
        )}

        {/* 既に所属しているときも、別の研究室に参加できるようにしておく */}
        {labs.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <LogIn className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                別の研究室に参加 / 新しく作る
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <form onSubmit={submitJoin} className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="参加コード"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={joinLab.isPending || !joinCode.trim()}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  参加
                </button>
              </form>
              <form onSubmit={submitCreate} className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新しい研究室の名前"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={createLab.isPending || !newName.trim()}
                  className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  作成
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
