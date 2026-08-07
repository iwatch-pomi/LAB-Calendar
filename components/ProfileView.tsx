"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useExperiments,
  useTasks,
  useEquipment,
  useTodos,
  useUpdateExperiment,
  useDeleteExperiment,
  useToggleTodo,
  useSettings,
  useUpdateFeature,
  useUserRole,
  useUpdateRole,
  useProfile,
  useUpdateProfile,
  useAddEquipment,
  useDeleteEquipment,
  useAddFeedback,
  useDeleteAccount,
} from "@/lib/queries";
import { useMyShares, useSharedWithMe, useMyLabs } from "@/lib/sharedQueries";
import { resolveTeacherView } from "@/lib/role";
import { BackHomeLink } from "./BackHomeLink";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeAccountSync } from "./useThemeAccountSync";
import { createClient } from "@/lib/supabase/client";
import { fmtTime } from "@/lib/calendar";
import {
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
} from "@/lib/config";
import {
  MODES,
  featuresByMode,
  type ExperimentMode,
} from "@/lib/features";
import {
  paletteFor,
  PALETTE_KEYS,
  AVATAR_EMOJIS,
  FEEDBACK_CATEGORIES,
  type Experiment,
  type FeedbackCategory,
} from "@/lib/types";
import {
  CheckCircle2,
  FlaskConical,
  Beaker,
  CalendarDays,
  Settings,
  Sun,
  Sprout,
  Plus,
  X,
  Wrench,
  LogOut,
  ListChecks,
  Atom,
  Cog,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Share2,
  Users,
  ChevronRight,
  Trash2,
  Pencil,
  MessageSquare,
  Send,
  UserCog,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { ThemeRoot } from "./ThemeRoot";
import { CONTACT_EMAIL, PRIVACY_PATH, TERMS_PATH } from "@/lib/site";
import {
  DeleteAccountModal,
  type DeleteAccountCounts,
} from "./DeleteAccountModal";

const MODE_ICON: Record<
  ExperimentMode,
  { icon: React.ReactNode; iconBg: string }
> = {
  bio: {
    icon: <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  chem: {
    icon: <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
  },
  physics: {
    icon: <Atom className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
  },
  engineering: {
    icon: <Cog className="h-4 w-4 text-slate-600 dark:text-slate-300" />,
    iconBg: "bg-slate-100 dark:bg-slate-500/20",
  },
};

function fmtDate(ms: number): string {
  const s = new Date(ms + 540 * 60000);
  return `${s.getUTCMonth() + 1}/${s.getUTCDate()}`;
}

export function ProfileView({
  userId,
  userEmail,
  initialIsTeacher,
}: {
  /** 自分が作成した研究室の判定に使う（退会時の警告） */
  userId: string;
  userEmail: string;
  /** サーバーで解決した利用形態。クライアントに明示値が入るまでの初期値 */
  initialIsTeacher: boolean;
}) {
  const router = useRouter();
  // /profile を直接開いた場合もアカウント側のテーマを反映する
  useThemeAccountSync();
  const experimentsQ = useExperiments();
  const tasksQ = useTasks();
  const equipmentQ = useEquipment();
  const todosQ = useTodos();
  const settingsQ = useSettings();
  const profileQ = useProfile();
  // 共有・研究室セクションの件数表示用
  const mySharesQ = useMyShares();
  const sharedWithMeQ = useSharedWithMe();
  const myLabsQ = useMyLabs();
  const updateExp = useUpdateExperiment();
  const deleteExp = useDeleteExperiment();
  const toggleTodo = useToggleTodo();
  const updateFeature = useUpdateFeature();
  const roleQ = useUserRole();
  const updateRole = useUpdateRole();
  const updateProfile = useUpdateProfile();
  const addEquipment = useAddEquipment();
  const deleteEquipment = useDeleteEquipment();

  const [newEquip, setNewEquip] = useState("");

  // プロフィール（表示名・アイコン）の編集
  const profile = profileQ.data;
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emojiInput, setEmojiInput] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState<string>(PALETTE_KEYS[0]);

  function startEditProfile() {
    setNameInput(profile?.display_name ?? "");
    setEmojiInput(profile?.avatar_emoji ?? null);
    setColorInput(profile?.avatar_color ?? PALETTE_KEYS[0]);
    setEditingProfile(true);
  }

  function saveProfile() {
    updateProfile.mutate({
      display_name: nameInput.trim() || null,
      avatar_emoji: emojiInput,
      avatar_color: colorInput,
    });
    setEditingProfile(false);
  }

  const experiments = experimentsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const equipment = equipmentQ.data ?? [];
  const features = settingsQ.data ?? {};
  const weekStartDay: 0 | 1 = features.week_start_day === 0 ? 0 : 1;
  const isTeacherView = resolveTeacherView(roleQ.data, initialIsTeacher);
  const workStart =
    typeof features.work_start_hour === "number"
      ? features.work_start_hour
      : DEFAULT_WORK_START_HOUR;
  const workEnd =
    typeof features.work_end_hour === "number"
      ? features.work_end_hour
      : DEFAULT_WORK_END_HOUR;

  const completedTodos = (todosQ.data ?? [])
    .filter((t) => t.done)
    .sort((a, b) => {
      const at = a.completed_at ?? a.created_at;
      const bt = b.completed_at ?? b.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });

  const myShares = mySharesQ.data ?? [];
  const sharedWithMe = sharedWithMeQ.data ?? [];
  const myLabs = myLabsQ.data ?? [];

  const activeExperiments = experiments.filter((e) => !e.archived);
  const archivedExperiments = experiments.filter((e) => e.archived);

  const doneCount = activeExperiments.filter((e) => e.status === "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  async function signOut() {
    if (!confirm("ログアウトしますか？")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function submitEquipment() {
    const name = newEquip.trim();
    if (!name) return;
    if (equipment.some((e) => e.name === name)) {
      setNewEquip("");
      return;
    }
    addEquipment.mutate({
      name,
      color: PALETTE_KEYS[equipment.length % PALETTE_KEYS.length],
    });
    setNewEquip("");
  }

  function restoreExperiment(exp: Experiment) {
    updateExp.mutate({ id: exp.id, archived: false });
  }

  function permanentlyDeleteExperiment(exp: Experiment) {
    if (
      confirm(
        `実験「${exp.name}」を完全に削除しますか？\nこの実験に紐づく予定もすべて削除され、元に戻せません。`,
      )
    ) {
      deleteExp.mutate(exp.id);
    }
  }

  const displayName = profile?.display_name?.trim() || userEmail;
  const initial = (displayName[0] ?? "?").toUpperCase();
  const avatarPal = paletteFor(profile?.avatar_color ?? PALETTE_KEYS[0]);

  return (
    <ThemeRoot>
      <div className="min-h-screen bg-[#f6f8fa] dark:bg-gray-950">
        {/* ヘッダー */}
        <header className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
            <BackHomeLink isTeacher={isTeacherView} />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-gray-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 dark:border-gray-700"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-6">
          {/* プロフィール */}
          <section className="mb-6">
            {editingProfile ? (
              <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:bg-brand-900/20 dark:border-brand-800">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
                  表示名
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={userEmail}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    アイコン
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEmojiInput(null)}
                      title="絵文字なし（イニシャル表示）"
                      className={`grid h-9 w-9 place-items-center rounded-xl border text-sm font-bold ${
                        emojiInput === null
                          ? "border-brand-400 ring-2 ring-brand-300"
                          : "border-gray-200 hover:border-gray-300 dark:hover:border-gray-600 dark:border-gray-700"
                      } ${paletteFor(colorInput).soft} ${paletteFor(colorInput).text}`}
                    >
                      {(nameInput || userEmail)[0]?.toUpperCase() ?? "?"}
                    </button>
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEmojiInput(emoji)}
                        className={`grid h-9 w-9 place-items-center rounded-xl border text-lg ${
                          emojiInput === emoji
                            ? "border-brand-400 ring-2 ring-brand-300"
                            : "border-gray-200 hover:border-gray-300 dark:hover:border-gray-600 dark:border-gray-700"
                        } ${paletteFor(colorInput).soft}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    背景色
                  </p>
                  <div className="flex items-center gap-1.5">
                    {PALETTE_KEYS.map((k) => {
                      const kp = paletteFor(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setColorInput(k)}
                          className={`h-6 w-6 rounded-full ${kp.dot} ${
                            colorInput === k
                              ? "ring-2 ring-gray-400 ring-offset-1"
                              : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-sm ${
                    profile?.avatar_emoji ? avatarPal.soft : avatarPal.dot
                  }`}
                >
                  {profile?.avatar_emoji ?? initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="truncate text-xl font-bold text-gray-800 dark:text-gray-100">
                      {displayName}
                    </h1>
                    <button
                      onClick={startEditProfile}
                      title="表示名・アイコンを編集"
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {profile?.display_name?.trim() && (
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 統計（教授は自分の実験を持たないので常に0件になる） */}
          {!isTeacherView && (
            <section className="mb-6 grid grid-cols-3 gap-3">
              <StatCard
                icon={<FlaskConical className="h-4 w-4" />}
                label="登録した実験"
                value={activeExperiments.length}
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="完了した実験"
                value={doneCount}
              />
              <StatCard
                icon={<Beaker className="h-4 w-4" />}
                label="完了タスク"
                value={doneTasks}
              />
            </section>
          )}

          {/* 利用形態（学生 / 教授） */}
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
            <div className="mb-3 flex items-center gap-1.5">
              <UserCog className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">利用形態</h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                教授・指導者にすると、自分のカレンダーではなく学生の予定をまとめて
                確認する画面が既定になります。
              </p>
              <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs dark:bg-gray-800 dark:border-gray-700">
                {(
                  [
                    [false, "学生"],
                    [true, "教授・指導者"],
                  ] as [boolean, string][]
                ).map(([value, label]) => (
                  <button
                    key={label}
                    // 保存が終わる前に移動すると、サーバーがまだ古い役割を読んで
                    // 弾き返してしまう。保存中は押せないようにしておく。
                    disabled={updateRole.isPending}
                    onClick={() =>
                      updateRole.mutate(value ? "teacher" : "student", {
                        // サーバーで解決している initialIsTeacher と、教授だった頃に
                        // 貯まった /app のキャッシュを貼り直す
                        onSettled: () => router.refresh(),
                      })
                    }
                    className={`rounded-md px-3 py-1 font-medium transition disabled:opacity-60 ${
                      isTeacherView === value
                        ? "bg-white text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {isTeacherView && (
              <Link
                href="/teacher"
                className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:bg-gray-800/40 dark:text-gray-200 dark:hover:bg-gray-800 dark:border-gray-700"
              >
                <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span className="flex-1">学生の予定を確認する</span>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </Link>
            )}
          </section>

          {/* 表示テーマ。カレンダー固有の設定ではなくアプリ全体の見た目なので、
              教授・指導者にも出す（教授はこの画面が唯一の設定画面になる）。 */}
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
            <div className="mb-3 flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                表示テーマ
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                画面の配色を選べます。「システム」は端末の設定に合わせて自動で
                切り替わります。
                <br />
                この設定はアカウントに保存され、別の端末でログインしても
                同じ配色になります。
              </p>
              <div className="shrink-0">
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* 以下はカレンダー関連の設定。教授・指導者は自分のカレンダーを
              持たないので、まとめて出さない（値も常に0件になる）。 */}
          {!isTeacherView && (
            <>
            {/* カレンダー設定 */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
              <div className="mb-3 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  カレンダー設定
                </h2>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  週表示・月表示の週の開始曜日を選べます（既定: 月曜）。
                </p>
                <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs dark:bg-gray-800 dark:border-gray-700">
                  {(
                    [
                      [1, "月曜"],
                      [0, "日曜"],
                    ] as [0 | 1, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() =>
                        updateFeature.mutate({ key: "week_start_day", value })
                      }
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        weekStartDay === value
                          ? "bg-white text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 通常の活動時間 */}
              <div className="mt-4 flex items-start justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  通常の活動時間（研究をする時間帯）を設定できます。週表示カレンダーの開始・終了時刻に太い横線を引いて、活動時間帯が一目で分かるようにします（既定: 8:00〜20:00）。
                </p>
                <div className="flex shrink-0 items-center gap-1.5 text-sm">
                  <select
                    value={workStart}
                    onChange={(e) =>
                      updateFeature.mutate({
                        key: "work_start_hour",
                        value: Number(e.target.value),
                      })
                    }
                    className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                      <option key={h} value={h} disabled={h >= workEnd}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 dark:text-gray-500">〜</span>
                  <select
                    value={workEnd}
                    onChange={(e) =>
                      updateFeature.mutate({
                        key: "work_end_hour",
                        value: Number(e.target.value),
                      })
                    }
                    className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                      <option key={h} value={h} disabled={h <= workStart}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* 共有・研究室 */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
              <div className="mb-1 flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">共有・研究室</h2>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                カレンダーを見せる相手を管理します。相手が予定を編集することはできません。
              </p>

              <div className="space-y-2">
                <Link
                  href="/shared"
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/40 dark:bg-gray-800/40 dark:border-gray-700"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/20">
                    <Share2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-800 group-hover:text-brand-700 dark:text-gray-100">
                      カレンダーを共有
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      教授・先輩・共同研究者に予定を見せて進捗を報告できます。
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-400 dark:text-gray-500">
                      共有中 {myShares.length} 件 ／ 見られるカレンダー{" "}
                      {sharedWithMe.length} 件
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-brand-600 dark:text-gray-500" />
                </Link>

                <Link
                  href="/lab"
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/40 dark:bg-gray-800/40 dark:border-gray-700"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-900/20">
                    <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-800 group-hover:text-brand-700 dark:text-gray-100">
                      研究室
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      研究室を作って参加コードを配る／参加コードで参加する。
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-400 dark:text-gray-500">
                      所属 {myLabs.length} 件
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-brand-600 dark:text-gray-500" />
                </Link>
              </div>
            </section>

            {/* 完了したToDo（サイドバーでは完了から24時間で非表示） */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
              <div className="mb-3 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  完了したToDo
                </h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {completedTodos.length}
                </span>
              </div>
              {completedTodos.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  完了したToDoはまだありません。
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {completedTodos.map((todo) => {
                    const at = todo.completed_at ?? todo.created_at;
                    const ms = new Date(at).getTime();
                    return (
                      <li
                        key={todo.id}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                      >
                        <button
                          onClick={() =>
                            toggleTodo.mutate({ id: todo.id, done: false })
                          }
                          title="未完了に戻す（サイドバーの今日のToDoに再表示されます）"
                          className="shrink-0 rounded-full text-emerald-500 transition hover:text-gray-400"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <span className="flex-1 truncate text-gray-500 line-through dark:text-gray-400">
                          {todo.title}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {fmtDate(ms)} {fmtTime(ms)} 完了
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 実験モード: モードごとに個別機能をON/OFF */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
              <div className="mb-3 flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">実験モード</h2>
              </div>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                分野ごとに、使いたい機能を個別にオンにできます（分野・機能とも複数選択可）。
              </p>

              <div className="space-y-5">
                {/* 一旦: 化学/物理/工学モードは非表示（生物のみ表示） */}
                {MODES.filter((mode) => mode.key === "bio").map((mode) => {
                  const feats = featuresByMode(mode.key);
                  const onCount = feats.filter((f) => !!features[f.key]).length;
                  const mi = MODE_ICON[mode.key];
                  const allOn = onCount === feats.length && feats.length > 0;
                  return (
                    <div key={mode.key}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-lg ${mi.iconBg}`}
                        >
                          {mi.icon}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {mode.title}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {onCount}/{feats.length}
                        </span>
                        {feats.length > 1 && (
                          <button
                            onClick={() =>
                              feats.forEach((f) =>
                                updateFeature.mutate({
                                  key: f.key,
                                  value: !allOn,
                                }),
                              )
                            }
                            className="ml-auto text-xs text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {allOn ? "すべてOFF" : "すべてON"}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 pl-1">
                        {feats.map((f) => (
                          <FeatureToggle
                            key={f.key}
                            icon={mi.icon}
                            iconBg={mi.iconBg}
                            title={f.title}
                            description={f.description}
                            checked={!!features[f.key]}
                            onChange={(v) =>
                              updateFeature.mutate({ key: f.key, value: v })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 使用機器の管理 */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
              <div className="mb-3 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">使用機器</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">{equipment.length}</span>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                予定に紐づけられる共通機器（遠心機・AKTA など）を登録します。削除しても過去の予定は残ります（機器の紐づけのみ外れます）。
              </p>

              <div className="mb-3 flex flex-wrap gap-2">
                {equipment.length === 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    まだ機器が登録されていません。
                  </span>
                )}
                {equipment.map((eq) => {
                  const pal = paletteFor(eq.color);
                  return (
                    <span
                      key={eq.id}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
                    >
                      <span className={`h-2 w-2 rounded-full ${pal.dot}`} />
                      <span className="text-gray-700 dark:text-gray-200">{eq.name}</span>
                      <button
                        onClick={() => deleteEquipment.mutate(eq.id)}
                        title="削除"
                        className="rounded-full p-0.5 text-gray-300 transition hover:bg-gray-200 hover:text-rose-500 dark:hover:bg-gray-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitEquipment();
                }}
                className="flex gap-2"
              >
                <input
                  value={newEquip}
                  onChange={(e) => setNewEquip(e.target.value)}
                  placeholder="機器名（例: サーマルサイクラー）"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  <Plus className="h-4 w-4" />
                  追加
                </button>
              </form>
            </section>

            {/* 継代培養（培地）はサイドバー「継代培養を管理」→ /culture ページに集約 */}

            {/* 一旦: 化学/物理/工学モードのツールは非表示 */}

            {/* アーカイブした実験 */}
            {archivedExperiments.length > 0 && (
              <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
                <div className="mb-3 flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    アーカイブした実験
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {archivedExperiments.length}
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  サイドバーの一覧には表示されません。名前をクリックすると、その実験だけの
                  カレンダーを別タブで開いて見返せます（復元はされません）。
                </p>
                <div className="space-y-2">
                  {archivedExperiments.map((exp) => {
                    const pal = paletteFor(exp.color);
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:bg-gray-800/40 dark:border-gray-700"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${pal.dot}`} />
                        <a
                          href={`/archive/${exp.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="別タブでこの実験のカレンダーを開く"
                          className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <span className="min-w-0 truncate text-sm font-medium text-gray-600 group-hover:text-brand-600 group-hover:underline dark:text-gray-300">
                            {exp.name}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-brand-600 dark:text-gray-500" />
                        </a>
                        <button
                          onClick={() => restoreExperiment(exp)}
                          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          復元
                        </button>
                        <button
                          onClick={() => permanentlyDeleteExperiment(exp)}
                          title="完全に削除"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 dark:text-gray-500 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            </>
          )}

          {/* お問い合わせ・ご要望（常に最後に配置） */}
          <FeedbackSection />

          {/* 規約・ポリシー。教授・指導者にも必要なので !isTeacherView の外に置く */}
          <LegalLinksSection />

          {/* 退会。取り消せない操作なので、いちばん最後に置く */}
          <DangerZoneSection
            userId={userId}
            email={userEmail}
            counts={{
              experiments: experiments.length,
              tasks: tasks.length,
              todos: todosQ.data?.length ?? 0,
              equipment: equipment.length,
              ownedLabs: (myLabsQ.data ?? [])
                .filter((l) => l.owner_id === userId)
                .map((l) => l.name),
              shares: mySharesQ.data?.length ?? 0,
            }}
          />
        </main>
      </div>
    </ThemeRoot>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

/**
 * 退会（アカウントの削除）。
 *
 * 取り消せない操作なので、押しやすい場所には置かない。実行の判断材料と
 * 確認は DeleteAccountModal 側に集約している。
 */
function DangerZoneSection({
  userId,
  email,
  counts,
}: {
  userId: string;
  email: string;
  counts: DeleteAccountCounts;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

  async function confirm() {
    setError(null);
    try {
      await deleteAccount.mutateAsync();
      // 削除後はセッションの持ち主が居ない。SPA 遷移だと古い状態が残るので
      // ページごと公式サイトへ移動する。
      window.location.href = "/";
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `削除できませんでした（${e.message}）`
          : "削除できませんでした。",
      );
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-500/30 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          アカウントの削除
        </h2>
      </div>
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        アカウントと、保存されている実験・予定・ToDo などをすべて削除します。
        取り消しはできず、削除したデータは復元できません。
      </p>
      <button
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
      >
        アカウントを削除する
      </button>

      {open && (
        <DeleteAccountModal
          email={email}
          counts={counts}
          deleting={deleteAccount.isPending}
          errorMessage={error}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
          key={userId}
        />
      )}
    </section>
  );
}

/** 利用規約・プライバシーポリシーへの導線（ログイン後の入口） */
function LegalLinksSection() {
  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="mb-3 flex items-center gap-1.5">
        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          規約・ポリシー
        </h2>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link
          href={TERMS_PATH}
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          利用規約
        </Link>
        <Link
          href={PRIVACY_PATH}
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          プライバシーポリシー
        </Link>
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        ご不明な点は、上のお問い合わせフォームか{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        までご連絡ください。
      </p>
    </section>
  );
}

/** お問い合わせ・ご要望の送信フォーム（開発者への連絡） */
function FeedbackSection() {
  const addFeedback = useAddFeedback();
  const [category, setCategory] = useState<FeedbackCategory>("improvement");
  const [body, setBody] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    addFeedback.mutate(
      {
        category,
        body: body.trim(),
        email: replyEmail.trim() || undefined,
      },
      {
        onSuccess: () => {
          setBody("");
          setReplyEmail("");
          setCategory("improvement");
          setSent(true);
        },
        onError: () =>
          setError("送信に失敗しました。時間をおいて再度お試しください。"),
      },
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          お問い合わせ・ご要望
        </h2>
      </div>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        改善してほしい点・欲しい機能・不具合などを開発者へ送れます。いただいた内容は今後の改善の参考にさせていただきます。
      </p>

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center dark:border-emerald-500/30">
          <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            送信しました。ありがとうございます！
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-2 text-xs text-emerald-700 hover:underline dark:text-emerald-300"
          >
            続けて送信する
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              種別
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    category === c.key
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:text-gray-300 dark:hover:border-gray-600 dark:border-gray-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              内容
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="例: 予定を色分けして印刷できるようにしてほしい"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              返信先メールアドレス（任意）
            </label>
            <input
              type="email"
              value={replyEmail}
              onChange={(e) => setReplyEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              返信が欲しい場合はご入力ください。返信は iwase.workslab@gmail.com からいたします。
            </p>
          </div>
          {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={!body.trim() || addFeedback.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {addFeedback.isPending ? "送信中…" : "送信する"}
          </button>
        </form>
      )}
    </section>
  );
}

/** 実験ツール共通のフィールド */
function ToolField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[11px] text-gray-500 dark:text-gray-400">
      {label}
      {children}
    </label>
  );
}

const toolInput =
  "mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500";

/** 化学実験モード: 収率計算・モル計算 */
function ChemTools() {
  const [theoretical, setTheoretical] = useState("");
  const [actual, setActual] = useState("");
  const [mass, setMass] = useState("");
  const [mw, setMw] = useState("");

  const yieldPct =
    Number(theoretical) > 0
      ? ((Number(actual) / Number(theoretical)) * 100).toFixed(1)
      : null;
  const mol =
    Number(mw) > 0 ? (Number(mass) / Number(mw)).toPrecision(4) : null;

  return (
    <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">化学ツール</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* 収率計算 */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800">
          <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            収率計算
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ToolField label="理論収量 (g/mol)">
              <input
                type="number"
                value={theoretical}
                onChange={(e) => setTheoretical(e.target.value)}
                className={toolInput}
              />
            </ToolField>
            <ToolField label="実収量 (g/mol)">
              <input
                type="number"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className={toolInput}
              />
            </ToolField>
          </div>
          <div className="mt-2 text-sm">
            収率:{" "}
            <span className="font-bold text-blue-700">
              {yieldPct !== null ? `${yieldPct} %` : "—"}
            </span>
          </div>
        </div>

        {/* モル計算 */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800">
          <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            モル計算
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ToolField label="質量 (g)">
              <input
                type="number"
                value={mass}
                onChange={(e) => setMass(e.target.value)}
                className={toolInput}
              />
            </ToolField>
            <ToolField label="分子量 (g/mol)">
              <input
                type="number"
                value={mw}
                onChange={(e) => setMw(e.target.value)}
                className={toolInput}
              />
            </ToolField>
          </div>
          <div className="mt-2 text-sm">
            物質量:{" "}
            <span className="font-bold text-blue-700">
              {mol !== null ? `${mol} mol` : "—"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 物理実験モード: 測定統計 */
function PhysicsTools() {
  const [raw, setRaw] = useState("");
  const nums = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));

  const n = nums.length;
  const mean = n > 0 ? nums.reduce((a, b) => a + b, 0) / n : null;
  const sd =
    n > 1 && mean !== null
      ? Math.sqrt(
          nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1),
        )
      : null;
  const sem = sd !== null ? sd / Math.sqrt(n) : null;

  const fmt = (v: number | null) => (v === null ? "—" : v.toPrecision(4));

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-500/30">
      <div className="mb-3 flex items-center gap-1.5">
        <Atom className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">測定統計</h2>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800">
        <ToolField label="測定値（カンマ or 空白区切り）">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={2}
            placeholder="例: 12.3, 12.5, 12.1, 12.4"
            className={`${toolInput} resize-none dark:bg-gray-800 dark:text-gray-100`}
          />
        </ToolField>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <StatMini label="件数" value={String(n)} />
          <StatMini label="平均" value={fmt(mean)} />
          <StatMini label="標準偏差" value={fmt(sd)} />
          <StatMini label="標準誤差" value={fmt(sem)} />
        </div>
      </div>
    </section>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-amber-50 px-2 py-1.5 dark:bg-amber-500/10">
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-bold text-amber-700 dark:text-amber-300">{value}</div>
    </div>
  );
}

/** 工学実験モード: 単位変換 */
const UNIT_GROUPS: Record<string, Record<string, number>> = {
  長さ: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
  質量: { kg: 1, g: 0.001, mg: 0.000001 },
};

function EngineeringTools() {
  const [group, setGroup] = useState("長さ");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("cm");
  const [value, setValue] = useState("1");

  const units = Object.keys(UNIT_GROUPS[group]);
  const result =
    Number.isFinite(Number(value)) &&
    UNIT_GROUPS[group][from] &&
    UNIT_GROUPS[group][to]
      ? (
          (Number(value) * UNIT_GROUPS[group][from]) /
          UNIT_GROUPS[group][to]
        ).toPrecision(6)
      : "—";

  function changeGroup(g: string) {
    setGroup(g);
    const u = Object.keys(UNIT_GROUPS[g]);
    setFrom(u[0]);
    setTo(u[1] ?? u[0]);
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Cog className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">単位変換</h2>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800">
        <div className="mb-2 flex gap-1.5">
          {Object.keys(UNIT_GROUPS).map((g) => (
            <button
              key={g}
              onClick={() => changeGroup(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                group === g
                  ? "bg-slate-700 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <ToolField label="値">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={toolInput}
            />
          </ToolField>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mb-0.5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <span className="mb-2 text-gray-400 dark:text-gray-500">→</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mb-0.5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-sm">
          結果:{" "}
          <span className="font-bold text-slate-700">
            {result} {to}
          </span>
        </div>
      </div>
    </section>
  );
}

function FeatureToggle({
  icon,
  iconBg = "bg-emerald-50 dark:bg-emerald-500/10",
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconBg}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      {/* トグルスイッチ */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4" : "left-0.5"
          } dark:bg-gray-900`}
        />
      </button>
    </label>
  );
}
