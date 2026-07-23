"use client";

import { useState } from "react";
import Link from "next/link";
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
  useProfile,
  useUpdateProfile,
  useAddEquipment,
  useDeleteEquipment,
  useAddFeedback,
} from "@/lib/queries";
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
  ChevronLeft,
  CheckCircle2,
  FlaskConical,
  Beaker,
  CalendarDays,
  Settings,
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
  Trash2,
  Pencil,
  MessageSquare,
  Send,
} from "lucide-react";

const MODE_ICON: Record<
  ExperimentMode,
  { icon: React.ReactNode; iconBg: string }
> = {
  bio: {
    icon: <Sprout className="h-4 w-4 text-emerald-600" />,
    iconBg: "bg-emerald-50",
  },
  chem: {
    icon: <FlaskConical className="h-4 w-4 text-blue-600" />,
    iconBg: "bg-blue-50",
  },
  physics: {
    icon: <Atom className="h-4 w-4 text-amber-600" />,
    iconBg: "bg-amber-50",
  },
  engineering: {
    icon: <Cog className="h-4 w-4 text-slate-600" />,
    iconBg: "bg-slate-100",
  },
};

function fmtDate(ms: number): string {
  const s = new Date(ms + 540 * 60000);
  return `${s.getUTCMonth() + 1}/${s.getUTCDate()}`;
}

export function ProfileView({ userEmail }: { userEmail: string }) {
  const experimentsQ = useExperiments();
  const tasksQ = useTasks();
  const equipmentQ = useEquipment();
  const todosQ = useTodos();
  const settingsQ = useSettings();
  const profileQ = useProfile();
  const updateExp = useUpdateExperiment();
  const deleteExp = useDeleteExperiment();
  const toggleTodo = useToggleTodo();
  const updateFeature = useUpdateFeature();
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

  const activeExperiments = experiments.filter((e) => !e.archived);
  const archivedExperiments = experiments.filter((e) => e.archived);

  const doneCount = activeExperiments.filter((e) => e.status === "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  async function signOut() {
    if (!confirm("ログアウトしますか？")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
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
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            カレンダーへ戻る
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
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
            <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
              <label className="block text-xs font-semibold text-gray-600">
                表示名
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={userEmail}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">
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
                        : "border-gray-200 hover:border-gray-300"
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
                          : "border-gray-200 hover:border-gray-300"
                      } ${paletteFor(colorInput).soft}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">
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
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
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
                  <h1 className="truncate text-xl font-bold text-gray-800">
                    {displayName}
                  </h1>
                  <button
                    onClick={startEditProfile}
                    title="表示名・アイコンを編集"
                    className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {profile?.display_name?.trim() && (
                  <p className="truncate text-sm text-gray-500">{userEmail}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 統計 */}
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

        {/* カレンダー設定 */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              カレンダー設定
            </h2>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              週表示・月表示の週の開始曜日を選べます（既定: 月曜）。
            </p>
            <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
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
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 通常の活動時間 */}
          <div className="mt-4 flex items-start justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
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
                className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-brand-500"
              >
                {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                  <option key={h} value={h} disabled={h >= workEnd}>
                    {h}:00
                  </option>
                ))}
              </select>
              <span className="text-gray-400">〜</span>
              <select
                value={workEnd}
                onChange={(e) =>
                  updateFeature.mutate({
                    key: "work_end_hour",
                    value: Number(e.target.value),
                  })
                }
                className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-brand-500"
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

        {/* 完了したToDo（サイドバーでは完了から24時間で非表示） */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              完了したToDo
            </h2>
            <span className="text-xs text-gray-400">
              {completedTodos.length}
            </span>
          </div>
          {completedTodos.length === 0 ? (
            <p className="text-xs text-gray-400">
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
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
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
                    <span className="flex-1 truncate text-gray-500 line-through">
                      {todo.title}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtDate(ms)} {fmtTime(ms)} 完了
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 実験モード: モードごとに個別機能をON/OFF */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">実験モード</h2>
          </div>
          <p className="mb-4 text-xs text-gray-500">
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
                    <span className="text-sm font-semibold text-gray-800">
                      {mode.title}
                    </span>
                    <span className="text-xs text-gray-400">
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
                        className="ml-auto text-xs text-brand-600 hover:underline"
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
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">使用機器</h2>
            <span className="text-xs text-gray-400">{equipment.length}</span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            予定に紐づけられる共通機器（遠心機・AKTA など）を登録します。削除しても過去の予定は残ります（機器の紐づけのみ外れます）。
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {equipment.length === 0 && (
              <span className="text-xs text-gray-400">
                まだ機器が登録されていません。
              </span>
            )}
            {equipment.map((eq) => {
              const pal = paletteFor(eq.color);
              return (
                <span
                  key={eq.id}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1.5 text-sm"
                >
                  <span className={`h-2 w-2 rounded-full ${pal.dot}`} />
                  <span className="text-gray-700">{eq.name}</span>
                  <button
                    onClick={() => deleteEquipment.mutate(eq.id)}
                    title="削除"
                    className="rounded-full p-0.5 text-gray-300 transition hover:bg-gray-200 hover:text-rose-500"
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
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
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

        {/* お問い合わせ・ご要望 */}
        <FeedbackSection userEmail={userEmail} />

        {/* 継代培養（培地）はサイドバー「継代培養を管理」→ /culture ページに集約 */}

        {/* 一旦: 化学/物理/工学モードのツールは非表示 */}

        {/* アーカイブした実験 */}
        {archivedExperiments.length > 0 && (
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <Archive className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                アーカイブした実験
              </h2>
              <span className="text-xs text-gray-400">
                {archivedExperiments.length}
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              サイドバーの一覧には表示されません。復元するとまた表示されます。
            </p>
            <div className="space-y-2">
              {archivedExperiments.map((exp) => {
                const pal = paletteFor(exp.color);
                return (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${pal.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-600">
                      {exp.name}
                    </span>
                    <button
                      onClick={() => restoreExperiment(exp)}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      復元
                    </button>
                    <button
                      onClick={() => permanentlyDeleteExperiment(exp)}
                      title="完全に削除"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-gray-400">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

/** お問い合わせ・ご要望の送信フォーム（開発者への連絡） */
function FeedbackSection({ userEmail }: { userEmail: string }) {
  const addFeedback = useAddFeedback();
  const [category, setCategory] = useState<FeedbackCategory>("improvement");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    addFeedback.mutate(
      { category, body: body.trim(), email: userEmail },
      {
        onSuccess: () => {
          setBody("");
          setCategory("improvement");
          setSent(true);
        },
        onError: () =>
          setError("送信に失敗しました。時間をおいて再度お試しください。"),
      },
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">
          お問い合わせ・ご要望
        </h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        改善してほしい点・欲しい機能・不具合などを開発者へ送れます。いただいた内容は今後の改善の参考にさせていただきます。
      </p>

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800">
            送信しました。ありがとうございます！
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-2 text-xs text-emerald-700 hover:underline"
          >
            続けて送信する
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
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
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              内容
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="例: 予定を色分けして印刷できるようにしてほしい"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!body.trim() || addFeedback.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {addFeedback.isPending ? "送信中…" : "送信する"}
            </button>
            <span className="text-[11px] text-gray-400">
              返信先: {userEmail}
            </span>
          </div>
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
    <label className="block text-[11px] text-gray-500">
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
        <FlaskConical className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-800">化学ツール</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* 収率計算 */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-gray-700">
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
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-gray-700">
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
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Atom className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-gray-800">測定統計</h2>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <ToolField label="測定値（カンマ or 空白区切り）">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={2}
            placeholder="例: 12.3, 12.5, 12.1, 12.4"
            className={`${toolInput} resize-none`}
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
    <div className="rounded-lg bg-amber-50 px-2 py-1.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="font-bold text-amber-700">{value}</div>
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
        <Cog className="h-4 w-4 text-slate-600" />
        <h2 className="text-sm font-semibold text-gray-800">単位変換</h2>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex gap-1.5">
          {Object.keys(UNIT_GROUPS).map((g) => (
            <button
              key={g}
              onClick={() => changeGroup(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                group === g
                  ? "bg-slate-700 text-white"
                  : "bg-gray-100 text-gray-600"
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
            className="mb-0.5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <span className="mb-2 text-gray-400">→</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mb-0.5 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
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
  iconBg = "bg-emerald-50",
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
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconBg}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
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
          checked ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
