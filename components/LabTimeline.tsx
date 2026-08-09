"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useLabMembers,
  useLabTimelineTasks,
  useLabTimelineExperiments,
  useVisibleProfiles,
  useMyUserId,
  profileLabel,
} from "@/lib/sharedQueries";
import { useSettings } from "@/lib/queries";
import { layoutTimelineRow } from "@/lib/timeline";
import { buildRange, fmtWeekRange, fmtTimeRange, nowMs, DAY } from "@/lib/calendar";
import { paletteFor, hatchBackground, type Task } from "@/lib/types";
import { SharedTaskDetail } from "./SharedCalendarView";
import { ChevronLeft, ChevronRight, EyeOff, CalendarDays } from "lucide-react";

/** 1日ぶんの横幅。7日で672px、14日で1344px。狭い画面では横スクロールになる */
const DAY_PX = 96;
/** バー1本の高さと段の間隔 */
const BAR_H = 20;
const BAR_GAP = 3;
/** 短い予定でも押せるだけの幅は残す */
const MIN_BAR_W = 14;
/** 名前列の幅 */
const NAME_W = 128;

/**
 * 研究室のメンバー全員の予定を、人ごとに1行・横に日付で並べる。
 *
 * ページの外枠（ThemeRoot・ヘッダー・見出し）は持たない。置く側が用意する。
 *
 * 予定は1クエリでまとめて取る（useLabTimelineTasks）。カレンダーを非公開に
 * しているメンバーは行だけ出して「非公開」と表示する。誰が公開していないかが
 * 分からないと、予定が無いのか見せてもらえないのか区別が付かないため。
 */
export function LabTimeline({ labId }: { labId: string }) {
  const membersQ = useLabMembers(labId);
  const profilesQ = useVisibleProfiles();
  const meQ = useMyUserId();
  const settingsQ = useSettings();

  const [refMs, setRefMs] = useState(() => nowMs());
  const [days, setDays] = useState<7 | 14>(7);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const members = useMemo(
    () => membersQ.data ?? [],
    [membersQ.data],
  );
  const me = meQ.data ?? null;

  // 見る側の設定に従う（相手の user_settings は共有されない）
  const weekStartsOn: 0 | 1 = settingsQ.data?.week_start_day === 0 ? 0 : 1;

  const cells = useMemo(
    () => buildRange(refMs, nowMs(), days, weekStartsOn),
    [refMs, days, weekStartsOn],
  );
  const windowStart = cells[0].startMs;
  const windowEnd = cells[cells.length - 1].startMs + DAY;

  /** 予定を取りに行く相手。非公開の人は最初から外す（どのみち返ってこない） */
  const sharingIds = useMemo(
    () => members.filter((m) => m.share_calendar).map((m) => m.user_id),
    [members],
  );

  const tasksQ = useLabTimelineTasks(sharingIds, windowStart, windowEnd);
  const experimentsQ = useLabTimelineExperiments(sharingIds);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profilesQ.data ?? []) m.set(p.user_id, profileLabel(p));
    return m;
  }, [profilesQ.data]);

  const expColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of experimentsQ.data ?? []) m.set(e.id, e.color);
    return m;
  }, [experimentsQ.data]);

  /** user_id ごとに予定を仕分ける */
  const tasksByUser = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasksQ.data ?? []) {
      const list = m.get(t.user_id);
      if (list) list.push(t);
      else m.set(t.user_id, [t]);
    }
    return m;
  }, [tasksQ.data]);

  const trackW = days * DAY_PX;

  function shiftBy(n: number) {
    setRefMs((v) => v + n * days * DAY);
  }

  return (
    <>
      {/* 期間の操作 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftBy(-1)}
            aria-label="前の期間"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setRefMs(nowMs())}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            今日
          </button>
          <button
            onClick={() => shiftBy(1)}
            aria-label="次の期間"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {fmtWeekRange(cells)}
          </span>
        </div>

        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs dark:border-gray-700 dark:bg-gray-800">
          {([7, 14] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                days === d
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {d}日
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <div style={{ minWidth: NAME_W + trackW }}>
            {/* 日付のヘッダー */}
            <div className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <div
                className="sticky left-0 z-20 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
                style={{ width: NAME_W }}
              />
              <div
                className="grid shrink-0"
                style={{
                  width: trackW,
                  gridTemplateColumns: `repeat(${days}, minmax(0,1fr))`,
                }}
              >
                {cells.map((c) => (
                  <div
                    key={c.startMs}
                    className={`py-1.5 text-center text-[11px] ${
                      c.isToday
                        ? "font-bold text-brand-700 dark:text-brand-300"
                        : c.isWeekend
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {c.month}/{c.dateNum}
                    <span className="ml-0.5">({c.weekdayJp})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* メンバーの行 */}
            {membersQ.isLoading ? (
              <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                読み込み中…
              </p>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                メンバーがいません。参加コードを配ってください。
              </p>
            ) : (
              members.map((m) => {
                const isMe = m.user_id === me;
                const label = nameById.get(m.user_id) ?? "不明なユーザー";
                const row = layoutTimelineRow(
                  tasksByUser.get(m.user_id) ?? [],
                  windowStart,
                  windowEnd,
                );
                const rowH = Math.max(
                  36,
                  row.laneCount * (BAR_H + BAR_GAP) + BAR_GAP * 2,
                );

                return (
                  <div
                    key={m.id}
                    className="flex border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    {/* 名前（横スクロールしても残す）。
                        「非公開」もここに出す。トラック側に置くと横スクロールで
                        流れて消えてしまい、予定が無いだけの人と区別が付かなくなる */}
                    <div
                      className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-gray-200 bg-white px-2.5 dark:border-gray-800 dark:bg-gray-900"
                      style={{ width: NAME_W, minHeight: rowH }}
                    >
                      {m.share_calendar && !isMe ? (
                        <Link
                          href={`/shared/${m.user_id}`}
                          title={`${label} のカレンダーを開く`}
                          className="min-w-0 truncate text-xs font-medium text-gray-700 hover:text-brand-700 hover:underline dark:text-gray-200 dark:hover:text-brand-300"
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                          {label}
                          {isMe && "（自分）"}
                        </span>
                      )}
                      {!m.share_calendar && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                          <EyeOff className="h-3 w-3 shrink-0" />
                          非公開
                        </span>
                      )}
                    </div>

                    {/* 予定のトラック */}
                    <div
                      className="relative shrink-0"
                      style={{ width: trackW, minHeight: rowH }}
                    >
                      {/* 日の区切り線と週末の色 */}
                      <div
                        className="pointer-events-none absolute inset-0 grid"
                        style={{
                          gridTemplateColumns: `repeat(${days}, minmax(0,1fr))`,
                        }}
                      >
                        {cells.map((c, i) => (
                          <div
                            key={c.startMs}
                            className={`${i === 0 ? "" : "border-l border-gray-100 dark:border-gray-800"} ${
                              c.isToday
                                ? "bg-brand-50/50 dark:bg-brand-900/10"
                                : c.isWeekend
                                  ? "bg-gray-50/60 dark:bg-gray-800/20"
                                  : ""
                            }`}
                          />
                        ))}
                      </div>

                      {m.share_calendar &&
                        row.bars.map((b) => {
                          const color = b.task.experiment_id
                            ? (expColorById.get(b.task.experiment_id) ?? null)
                            : null;
                          const pal = paletteFor(color);
                          const s = new Date(b.task.start_time).getTime();
                          const e = new Date(b.task.end_time).getTime();
                          return (
                            <button
                              key={b.task.id}
                              onClick={() => setOpenTask(b.task)}
                              title={`${b.task.title}｜${fmtTimeRange(s, e)}`}
                              style={{
                                left: `${b.leftPct}%`,
                                width: `${b.widthPct}%`,
                                // 数時間の予定は日単位の幅では数pxになってしまう。
                                // 見えない・押せないと「何も無い日」と区別が付かないので
                                // 下限を入れる（WeekView が高さに下限を入れているのと同じ理由）
                                minWidth: MIN_BAR_W,
                                top: BAR_GAP + b.lane * (BAR_H + BAR_GAP),
                                height: BAR_H,
                                // 端で切れているバーは角を落として「続き」を示す
                                borderTopLeftRadius: b.clippedLeft ? 0 : undefined,
                                borderBottomLeftRadius: b.clippedLeft ? 0 : undefined,
                                borderTopRightRadius: b.clippedRight ? 0 : undefined,
                                borderBottomRightRadius: b.clippedRight
                                  ? 0
                                  : undefined,
                                ...(b.task.is_wait
                                  ? { backgroundImage: hatchBackground(color) }
                                  : {}),
                              }}
                              className={`absolute overflow-hidden rounded-md border px-1 text-left text-[10px] leading-[18px] transition hover:brightness-95 ${pal.border} ${pal.text} ${
                                b.task.is_wait ? "bg-white dark:bg-gray-900" : pal.bg
                              } ${b.task.status === "done" ? "opacity-60" : ""}`}
                            >
                              <span className="block truncate">
                                {b.clippedLeft && "◂"}
                                {b.task.title}
                                {b.clippedRight && "▸"}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 読み込み・エラーの案内 */}
      {tasksQ.isError && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          予定を読み込めませんでした。時間をおいて開き直してください。
        </p>
      )}
      {members.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <CalendarDays className="h-3.5 w-3.5" />
          予定をクリックすると詳細とコメントを開けます。名前をクリックするとその人のカレンダーに移動します。
        </p>
      )}

      {openTask && (
        <SharedTaskDetail
          task={openTask}
          equipmentName={null}
          myId={me}
          onClose={() => setOpenTask(null)}
        />
      )}
    </>
  );
}
