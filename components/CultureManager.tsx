"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useCultureMedia,
  useAddCultureMedium,
  useUpdateCultureMedium,
  useDeleteCultureMedium,
  useSettings,
} from "@/lib/queries";
import {
  buildMonthGrid,
  orderedWeekdayJp,
  fmtMonthTitle,
  nowMs,
} from "@/lib/calendar";
import {
  cultureStatus,
  CULTURE_STATUS_META,
  fmtMd,
  todayJst,
  daysBetween,
  type CultureStatus,
} from "@/lib/culture";
import type { CultureMedium } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Trash2,
  Sprout,
  CalendarDays,
  ListChecks,
  GitBranch,
  FlaskConical,
  AlertTriangle,
  CircleAlert,
} from "lucide-react";

const TZ = 540 * 60 * 1000;

/** Tokyo 深夜0時の UTC ms → "YYYY-MM-DD" */
function cellDate(startMs: number): string {
  const s = new Date(startMs + TZ);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${s.getUTCFullYear()}-${p(s.getUTCMonth() + 1)}-${p(s.getUTCDate())}`;
}

/** その培地が「かかっている」最終日（廃棄日 > 期限日 > 作成日） */
function endDate(m: CultureMedium): string {
  return m.disposed_date ?? m.expiry_date ?? m.created_date;
}

type Tab = "calendar" | "list" | "graph";

export function CultureManager({ userEmail }: { userEmail: string }) {
  const mediaQ = useCultureMedia();
  const addMedium = useAddCultureMedium();
  const updateMedium = useUpdateCultureMedium();
  const deleteMedium = useDeleteCultureMedium();
  const settings = useSettings().data ?? {};
  const weekStartsOn: 0 | 1 = settings.week_start_day === 0 ? 0 : 1;

  const media = mediaQ.data ?? [];
  const today = todayJst();

  const [tab, setTab] = useState<Tab>("calendar");
  const [refMs, setRefMs] = useState<number>(() => nowMs());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // 登録フォーム
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [createdDate, setCreatedDate] = useState(today);
  const [expiry, setExpiry] = useState("");
  const [parentId, setParentId] = useState("");
  const [note, setNote] = useState("");

  // ステータス集計
  const statusOf = useMemo(() => {
    const m = new Map<string, CultureStatus>();
    for (const cm of media) m.set(cm.id, cultureStatus(cm, today));
    return m;
  }, [media, today]);

  const counts = useMemo(() => {
    let culturing = 0,
      near = 0,
      expired = 0;
    for (const cm of media) {
      const s = statusOf.get(cm.id);
      if (s === "culturing") culturing++;
      else if (s === "near") near++;
      else if (s === "expired") expired++;
    }
    return { culturing, near, expired };
  }, [media, statusOf]);

  const nameById = useMemo(
    () => new Map(media.map((m) => [m.id, m.name])),
    [media],
  );

  function resetForm() {
    setName("");
    setCreatedDate(today);
    setExpiry("");
    setParentId("");
    setNote("");
    setRegistering(false);
  }

  function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addMedium.mutate({
      name: name.trim(),
      created_date: createdDate || today,
      expiry_date: expiry || null,
      parent_id: parentId || null,
      note: note.trim() || null,
    });
    resetForm();
  }

  const initial = (userEmail[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            カレンダーへ戻る
          </Link>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            {initial}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {/* タイトル + 培地登録 */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Sprout className="h-5 w-5 text-emerald-600" />
              培地管理システム
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              培養培地の作成・管理・活用・引き継ぎを効率的に行います
            </p>
          </div>
          <button
            onClick={() => setRegistering((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            培地登録
          </button>
        </div>

        {/* 登録フォーム */}
        {registering && (
          <form
            onSubmit={submitRegister}
            className="mb-5 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-600">
                培地名
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 大腸菌 前培養 LB"
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs text-gray-600">
                継代元（任意）
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">なし</option>
                  {media.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-600">
                作成日
                <input
                  type="date"
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs text-gray-600">
                期限日（任意）
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <label className="block text-xs text-gray-600">
              メモ（任意）
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="継代比 1:10 など"
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                登録
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* 統計 */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard
            icon={<FlaskConical className="h-4 w-4" />}
            label="培養中"
            value={counts.culturing}
            valueClass="text-emerald-600"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="期限切れ間近"
            value={counts.near}
            valueClass="text-amber-600"
          />
          <StatCard
            icon={<CircleAlert className="h-4 w-4" />}
            label="期限切れ"
            value={counts.expired}
            valueClass="text-rose-600"
          />
        </div>

        {/* タブ */}
        <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 text-sm">
          <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")} icon={<CalendarDays className="h-4 w-4" />}>
            カレンダー表示
          </TabButton>
          <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={<ListChecks className="h-4 w-4" />}>
            リスト表示
          </TabButton>
          <TabButton active={tab === "graph"} onClick={() => setTab("graph")} icon={<GitBranch className="h-4 w-4" />}>
            相関図
          </TabButton>
        </div>

        {mediaQ.isLoading ? (
          <p className="py-16 text-center text-sm text-gray-400">読み込み中…</p>
        ) : tab === "calendar" ? (
          <CalendarTab
            media={media}
            statusOf={statusOf}
            refMs={refMs}
            onRefChange={setRefMs}
            weekStartsOn={weekStartsOn}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setHighlightedId(null);
            }}
            nameById={nameById}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
            onUpdate={(id, patch) => updateMedium.mutate({ id, ...patch })}
          />
        ) : tab === "list" ? (
          <ListTab
            media={media}
            statusOf={statusOf}
            nameById={nameById}
            onUpdate={(id, patch) => updateMedium.mutate({ id, ...patch })}
            onDelete={(m) => {
              if (
                confirm(
                  `培地「${m.name}」を削除しますか？\nこの操作は元に戻せません。`,
                )
              )
                deleteMedium.mutate(m.id);
            }}
          />
        ) : (
          <GraphTab media={media} statusOf={statusOf} />
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`mt-1 text-3xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- カレンダー表示 ---------------- */
function CalendarTab({
  media,
  statusOf,
  refMs,
  onRefChange,
  weekStartsOn,
  selectedDate,
  onSelectDate,
  nameById,
  highlightedId,
  onHighlight,
  onUpdate,
}: {
  media: CultureMedium[];
  statusOf: Map<string, CultureStatus>;
  refMs: number;
  onRefChange: (ms: number) => void;
  weekStartsOn: 0 | 1;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  nameById: Map<string, string>;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CultureMedium>) => void;
}) {
  const weeks = buildMonthGrid(refMs, nowMs(), weekStartsOn);
  const curMonth = new Date(refMs + TZ).getUTCMonth() + 1;
  const header = orderedWeekdayJp(weekStartsOn);

  // 日付 → その日にかかる培地
  function mediaOn(date: string): CultureMedium[] {
    return media.filter(
      (m) => m.created_date <= date && date <= endDate(m),
    );
  }

  const selected = mediaOn(selectedDate);

  // 1週間(7日)ぶんの帯を「行(レーン)」に振り分け、途切れず1本の帯として描画できるようにする
  const MAX_LANES = 4;
  const BAR_H = 12; // 帯の高さ(px)
  const BAR_GAP = 3; // 帯どうしの縦の隙間(px)
  const DATE_H = 26; // 日付数字ぶんの上部スペース(px)

  function computeWeekBars(weekDates: string[]) {
    const overlapping = media.filter(
      (m) => m.created_date <= weekDates[6] && endDate(m) >= weekDates[0],
    );
    const sorted = [...overlapping].sort((a, b) => {
      if (a.created_date !== b.created_date)
        return a.created_date < b.created_date ? -1 : 1;
      const ea = endDate(a);
      const eb = endDate(b);
      return ea === eb ? 0 : ea > eb ? -1 : 1; // 長い帯を優先して上のレーンへ
    });
    const laneEnds: number[] = [];
    const items = sorted.map((m) => {
      const startRaw = daysBetween(weekDates[0], m.created_date);
      const endRaw = daysBetween(weekDates[0], endDate(m));
      const startIdx = Math.max(0, Math.min(6, startRaw));
      const endIdx = Math.max(0, Math.min(6, endRaw));
      let lane = laneEnds.findIndex((end) => end < startIdx);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(endIdx);
      } else {
        laneEnds[lane] = endIdx;
      }
      return {
        m,
        startIdx,
        endIdx,
        isTrueStart: startRaw >= 0,
        isTrueEnd: endRaw <= 6,
        lane,
      };
    });
    return { items, laneCount: laneEnds.length };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* カレンダー */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* 月ナビ */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">培養カレンダー</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRefChange(refMs - 30 * 24 * 3600 * 1000)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-semibold text-gray-800">
              {fmtMonthTitle(refMs)}
            </span>
            <button
              onClick={() => onRefChange(refMs + 30 * 24 * 3600 * 1000)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 曜日 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {header.map((w) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-medium ${
                w === "日" ? "text-rose-400" : w === "土" ? "text-sky-400" : "text-gray-400"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* グリッド */}
        <div>
          {weeks.map((week, wi) => {
            const weekDates = week.map((c) => cellDate(c.startMs));
            const { items, laneCount } = computeWeekBars(weekDates);
            const visibleLanes = Math.min(laneCount, MAX_LANES);
            const overflowCount = items.filter(
              (it) => it.lane >= MAX_LANES,
            ).length;
            const rowMinHeight = Math.max(
              64,
              DATE_H + visibleLanes * (BAR_H + BAR_GAP) + 8,
            );
            return (
              <div
                key={wi}
                className="relative grid grid-cols-7"
                style={{ minHeight: rowMinHeight }}
              >
                {week.map((cell) => {
                  const date = cellDate(cell.startMs);
                  const isOther = cell.month !== curMonth;
                  const isSel = date === selectedDate;
                  return (
                    <button
                      key={cell.startMs}
                      onClick={() => onSelectDate(date)}
                      className={`flex items-start justify-start border-b border-l border-gray-100 p-1 text-left transition hover:bg-brand-50/40 ${
                        cell.isWeekend ? "bg-gray-50/40" : ""
                      } ${isSel ? "ring-2 ring-inset ring-brand-400" : ""}`}
                    >
                      <div
                        className={`inline-grid h-5 w-5 place-items-center rounded-full text-xs font-semibold ${
                          cell.isToday
                            ? "bg-brand-500 text-white"
                            : isOther
                              ? "text-gray-300"
                              : "text-gray-600"
                        }`}
                      >
                        {cell.dateNum}
                      </div>
                    </button>
                  );
                })}

                {/* 帯オーバーレイ: 週内は複数日にまたがっても1本の帯として途切れず描画 */}
                <div
                  className="pointer-events-none absolute inset-x-0 grid grid-cols-7"
                  style={{
                    top: DATE_H,
                    gridAutoRows: BAR_H,
                    rowGap: BAR_GAP,
                  }}
                >
                  {items
                    .filter((it) => it.lane < MAX_LANES)
                    .map((it) => {
                      const st =
                        CULTURE_STATUS_META[
                          statusOf.get(it.m.id) ?? "culturing"
                        ];
                      const isHi = highlightedId === it.m.id;
                      const dimmed = highlightedId !== null && !isHi;
                      return (
                        <div
                          key={it.m.id}
                          onClick={() => onHighlight(isHi ? null : it.m.id)}
                          title={it.m.name}
                          className={`pointer-events-auto relative cursor-pointer ${st.bar} ${
                            it.isTrueStart ? "rounded-l-full ml-0.5" : "ml-0"
                          } ${it.isTrueEnd ? "rounded-r-full mr-0.5" : "mr-0"} ${
                            isHi ? "z-10 shadow ring-2 ring-gray-800" : ""
                          } ${dimmed ? "opacity-30" : ""}`}
                          style={{
                            gridColumn: `${it.startIdx + 1} / ${it.endIdx + 2}`,
                            gridRow: it.lane + 1,
                          }}
                        >
                          <span className="block truncate px-1 text-[9px] font-medium leading-3 text-white">
                            {it.m.name}
                          </span>
                        </div>
                      );
                    })}
                </div>
                {overflowCount > 0 && (
                  <div className="pointer-events-none absolute bottom-0.5 right-1 text-[9px] text-gray-400">
                    +{overflowCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500">
          <Legend cls="bg-emerald-400" label="培養中" />
          <Legend cls="bg-amber-400" label="期限切れ間近" />
          <Legend cls="bg-rose-400" label="期限切れ" />
          <Legend cls="bg-gray-300" label="廃棄済み" />
          <span>※ 帯は作成日〜期限日（または廃棄日）の培養期間</span>
        </div>
      </div>

      {/* 選択日パネル */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">
          {fmtMd(selectedDate)} の培地
        </h2>
        <p className="mb-3 mt-0.5 text-xs text-gray-400">
          選択した日付に関連する培地一覧
        </p>
        {selected.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            この日付に関連する培地はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {selected.map((m) => (
              <MediumRow
                key={m.id}
                m={m}
                status={statusOf.get(m.id) ?? "culturing"}
                parentName={m.parent_id ? nameById.get(m.parent_id) : null}
                media={media}
                highlighted={highlightedId === m.id}
                onHighlight={onHighlight}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-4 rounded-full ${cls}`} />
      {label}
    </span>
  );
}

function MediumRow({
  m,
  status,
  parentName,
  media,
  highlighted,
  onHighlight,
  onUpdate,
}: {
  m: CultureMedium;
  status: CultureStatus;
  parentName?: string | null;
  media: CultureMedium[];
  highlighted: boolean;
  onHighlight: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CultureMedium>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const st = CULTURE_STATUS_META[status];

  if (editing) {
    return (
      <li>
        <MediumEditForm
          m={m}
          media={media}
          onSave={(patch) => {
            onUpdate(m.id, patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      onClick={() => onHighlight(highlighted ? null : m.id)}
      title="クリックでカレンダー上をハイライト"
      className={`group cursor-pointer rounded-xl border p-2.5 transition ${
        highlighted
          ? "border-brand-300 bg-brand-50 ring-2 ring-brand-300"
          : "border-gray-100 bg-gray-50/60 hover:border-brand-200 hover:bg-brand-50/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
          {m.name}
        </span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
          {st.label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          title="編集"
          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
        <span>作成 {fmtMd(m.created_date)}</span>
        {m.expiry_date && <span>期限 {fmtMd(m.expiry_date)}</span>}
        {m.disposed_date && <span>廃棄 {fmtMd(m.disposed_date)}</span>}
        {parentName && <span>継代元: {parentName}</span>}
      </div>
    </li>
  );
}

/** 培地の編集フォーム（登録時と同じ項目: 名前・作成日・期限・継代元・メモ） */
function MediumEditForm({
  m,
  media,
  onSave,
  onCancel,
}: {
  m: CultureMedium;
  media: CultureMedium[];
  onSave: (patch: Partial<CultureMedium>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(m.name);
  const [created, setCreated] = useState(m.created_date);
  const [expiry, setExpiry] = useState(m.expiry_date ?? "");
  const [parent, setParent] = useState(m.parent_id ?? "");
  const [note, setNote] = useState(m.note ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      created_date: created || todayJst(),
      expiry_date: expiry || null,
      parent_id: parent || null,
      note: note.trim() || null,
    });
  }

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={submit}
      className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50/40 p-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="培地名"
        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-gray-500">
          作成日
          <input
            type="date"
            value={created}
            onChange={(e) => setCreated(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="text-[11px] text-gray-500">
          期限
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="text-[11px] text-gray-500">
          継代元
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option value="">なし</option>
            {media
              .filter((cand) => cand.id !== m.id)
              .map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="block text-[11px] text-gray-500">
        メモ
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="継代比 1:10 など"
          className="mt-0.5 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

/* ---------------- リスト表示 ---------------- */
function ListTab({
  media,
  statusOf,
  nameById,
  onUpdate,
  onDelete,
}: {
  media: CultureMedium[];
  statusOf: Map<string, CultureStatus>;
  nameById: Map<string, string>;
  onUpdate: (id: string, patch: Partial<CultureMedium>) => void;
  onDelete: (m: CultureMedium) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);

  if (media.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
        まだ培地が登録されていません。「培地登録」から追加してください。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {media.map((m) => {
        const st = CULTURE_STATUS_META[statusOf.get(m.id) ?? "culturing"];
        if (editId === m.id) {
          return (
            <MediumEditForm
              key={m.id}
              m={m}
              media={media}
              onSave={(patch) => {
                onUpdate(m.id, patch);
                setEditId(null);
              }}
              onCancel={() => setEditId(null)}
            />
          );
        }
        const parentName = m.parent_id ? nameById.get(m.parent_id) : null;
        return (
          <div
            key={m.id}
            className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3"
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-gray-800">
                  {m.name}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
                  {st.label}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
                <span>作成 {fmtMd(m.created_date)}</span>
                {m.expiry_date && <span>期限 {fmtMd(m.expiry_date)}</span>}
                {m.disposed_date && <span>廃棄 {fmtMd(m.disposed_date)}</span>}
                {parentName && <span>継代元: {parentName}</span>}
                {m.note && <span>{m.note}</span>}
              </div>
            </div>
            {/* 廃棄 / 復元 */}
            {m.disposed_date ? (
              <button
                onClick={() => onUpdate(m.id, { disposed_date: null })}
                title="廃棄を取消"
                className="rounded-lg px-2 py-1 text-[11px] text-gray-500 opacity-0 transition hover:bg-gray-100 group-hover:opacity-100"
              >
                復元
              </button>
            ) : (
              <button
                onClick={() => onUpdate(m.id, { disposed_date: todayJst() })}
                title="廃棄する"
                className="rounded-lg px-2 py-1 text-[11px] text-gray-500 opacity-0 transition hover:bg-gray-100 group-hover:opacity-100"
              >
                廃棄
              </button>
            )}
            <button
              onClick={() => setEditId(m.id)}
              title="編集"
              className="rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(m)}
              title="削除"
              className="rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-rose-500 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 相関図（継代系統） ---------------- */
function GraphTab({
  media,
  statusOf,
}: {
  media: CultureMedium[];
  statusOf: Map<string, CultureStatus>;
}) {
  const byId = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, CultureMedium[]>();
    for (const m of media) {
      if (!m.parent_id) continue;
      if (!map.has(m.parent_id)) map.set(m.parent_id, []);
      map.get(m.parent_id)!.push(m);
    }
    return map;
  }, [media]);

  // ルート = 親なし or 親が存在しない
  const roots = media.filter((m) => !m.parent_id || !byId.has(m.parent_id));

  function renderNode(m: CultureMedium, visited: Set<string>): React.ReactNode {
    const cyclic = visited.has(m.id);
    const next = new Set(visited);
    next.add(m.id);
    const children = cyclic ? [] : childrenOf.get(m.id) ?? [];
    const st = CULTURE_STATUS_META[statusOf.get(m.id) ?? "culturing"];
    return (
      <div key={m.id}>
        <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-emerald-200">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-gray-800">
              {m.name}
            </div>
            <div className="truncate text-[10px] text-gray-400">
              作成 {fmtMd(m.created_date)}
              {m.expiry_date ? ` ・期限 ${fmtMd(m.expiry_date)}` : ""}
            </div>
          </div>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
            {st.label}
          </span>
        </div>
        {children.length > 0 && (
          <div className="relative ml-3.5 mt-1.5 pl-4">
            {children.map((c, i) => {
              const isLast = i === children.length - 1;
              return (
                <div key={c.id} className={`relative ${isLast ? "" : "pb-1.5"}`}>
                  {/* 縦線: 最後の子は接続点(elbow)で止め、そうでなければ次の兄弟まで伸ばす */}
                  <span
                    className={`absolute -left-4 w-0.5 bg-emerald-300 ${
                      isLast ? "top-0 h-4" : "top-0 bottom-0"
                    }`}
                  />
                  {/* 横線（接続点） */}
                  <span className="absolute -left-4 top-4 h-0.5 w-4 rounded-full bg-emerald-300" />
                  {renderNode(c, next)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
        まだ培地が登録されていません。継代元を指定して登録すると系統が表示されます。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {roots.map((m) => (
        <div
          key={m.id}
          className="overflow-x-auto rounded-2xl border border-gray-200 bg-emerald-50/30 p-4 thin-scroll"
        >
          {renderNode(m, new Set())}
        </div>
      ))}
      <p className="px-1 text-[11px] text-gray-400">
        継代元 → 下にぶら下がるほど後の継代です。
      </p>
    </div>
  );
}
