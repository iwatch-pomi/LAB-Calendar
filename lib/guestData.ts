// ゲスト（未ログイン）向けのデモデータ。
// supabase/sql/03_seed_function.sql の内容を TypeScript へ移植したもの。
// ログイン後の初回表示と同じ見た目になるよう、内容・時刻を揃えている。
// seed_demo_data() は匿名ユーザーでは実行できない（anon に EXECUTE 権限が無く、
// uid が null だと例外を投げる）ため、ゲストにはこちらを使う。

import { weekStartMs, DAY } from "@/lib/calendar";
import type {
  Equipment,
  Experiment,
  Task,
  TaskDependency,
  Template,
  TemplateStep,
  Todo,
} from "@/lib/types";

/** ゲストデータの user_id（サーバーには送らないダミー値） */
export const GUEST_USER_ID = "guest";

export interface GuestSnapshot {
  equipment: Equipment[];
  templates: Template[];
  templateSteps: TemplateStep[];
  experiments: Experiment[];
  tasks: Task[];
  deps: TaskDependency[];
  todos: Todo[];
}

/** 「今週の月曜」+ d日 の h時mi分（JST）を ISO 文字列で返す */
function at(mondayMs: number, d: number, h: number, mi = 0): string {
  return new Date(mondayMs + d * DAY + h * 3600000 + mi * 60000).toISOString();
}

/**
 * デモ一式を生成する。SQL 版と同じく「今週（月曜始まり・JST）」を基点にするので、
 * いつアクセスしても今週の予定として表示される。
 */
export function buildGuestDemo(nowMs: number = Date.now()): GuestSnapshot {
  const monday = weekStartMs(nowMs, 1);
  const createdAt = new Date(nowMs).toISOString();
  const u = GUEST_USER_ID;

  // ---- 装置 ----
  const eqCentrifuge: Equipment = {
    id: "guest-eq-centrifuge",
    user_id: u,
    name: "遠心機",
    color: "sky",
    created_at: createdAt,
  };
  const eqAkta: Equipment = {
    id: "guest-eq-akta",
    user_id: u,
    name: "AKTA",
    color: "violet",
    created_at: createdAt,
  };

  // ---- テンプレート ----
  const tplEcoli: Template = {
    id: "guest-tpl-ecoli",
    user_id: u,
    name: "大腸菌タンパク質発現",
    description: "全6ステップ・約4日・遠心機/AKTA",
    estimated_label: "約4日",
    total_steps: 6,
    color: "teal",
    created_at: createdAt,
  };
  const tplPlasmid: Template = {
    id: "guest-tpl-plasmid",
    user_id: u,
    name: "プラスミド抽出＋制限酵素",
    description: "全4ステップ・約1日",
    estimated_label: "約1日",
    total_steps: 4,
    color: "violet",
    created_at: createdAt,
  };
  const tplSds: Template = {
    id: "guest-tpl-sds",
    user_id: u,
    name: "SDS-PAGE 電気泳動",
    description: "全3ステップ・半日",
    estimated_label: "半日",
    total_steps: 3,
    color: "sky",
    created_at: createdAt,
  };

  const step = (
    templateId: string,
    order: number,
    title: string,
    subtitle: string | null,
    duration: number,
    waitAfter: number,
    equipmentName: string | null,
    needsReservation: boolean,
  ): TemplateStep => ({
    id: `${templateId}-s${order}`,
    template_id: templateId,
    step_order: order,
    title,
    subtitle,
    offset_from_prev_minutes: 0,
    duration_minutes: duration,
    wait_after_minutes: waitAfter,
    equipment_name: equipmentName,
    needs_reservation: needsReservation,
  });

  const templateSteps: TemplateStep[] = [
    step(tplEcoli.id, 1, "前培養（LB液体）", null, 90, 810, null, false),
    step(tplEcoli.id, 2, "本培養 開始", null, 60, 0, null, false),
    step(tplEcoli.id, 3, "培養待機", "37℃ / 6h", 360, 0, null, false),
    step(tplEcoli.id, 4, "IPTG誘導", null, 30, 990, null, false),
    step(tplEcoli.id, 5, "菌体回収・遠心", null, 120, 0, "遠心機", true),
    step(tplEcoli.id, 6, "Ni-NTA 精製", null, 180, 0, "AKTA", true),

    step(tplPlasmid.id, 1, "ミニプレップ", null, 60, 0, null, false),
    step(tplPlasmid.id, 2, "制限酵素処理", "37℃", 90, 60, null, false),
    step(tplPlasmid.id, 3, "アガロース電気泳動", null, 60, 0, null, false),
    step(tplPlasmid.id, 4, "精製・確認", null, 60, 0, null, false),

    step(tplSds.id, 1, "サンプル調製", null, 30, 0, null, false),
    step(tplSds.id, 2, "電気泳動", null, 90, 0, null, false),
    step(tplSds.id, 3, "染色・脱色", null, 120, 30, null, false),
  ];

  // ---- 実験 ----
  const expEcoli: Experiment = {
    id: "guest-exp-ecoli",
    user_id: u,
    template_id: tplEcoli.id,
    name: "大腸菌タンパク質発現",
    status: "in_progress",
    current_step: 2,
    total_steps: 6,
    color: "teal",
    archived: false,
    created_at: createdAt,
  };
  const expPlasmid: Experiment = {
    id: "guest-exp-plasmid",
    user_id: u,
    template_id: tplPlasmid.id,
    name: "プラスミド抽出＋制限酵素",
    status: "planning",
    current_step: 0,
    total_steps: 4,
    color: "violet",
    archived: false,
    created_at: createdAt,
  };

  // ---- 予定（曜日: 月=0, 火=1, 水=2, 木=3, 金=4）----
  const task = (
    experimentId: string,
    id: string,
    title: string,
    subtitle: string | null,
    startISO: string,
    endISO: string,
    status: Task["status"],
    equipmentId: string | null,
    needsReservation: boolean,
    isWait: boolean,
  ): Task => ({
    id,
    user_id: u,
    experiment_id: experimentId,
    title,
    subtitle,
    start_time: startISO,
    end_time: endISO,
    status,
    equipment_id: equipmentId,
    needs_reservation: needsReservation,
    is_wait: isWait,
    task_kind: isWait ? "wait" : "operation",
    template_step_id: null,
    notes: null,
    created_at: createdAt,
  });

  const tPre = task(expEcoli.id, "guest-task-pre", "前培養（LB液体）", null, at(monday, 0, 18), at(monday, 0, 19, 30), "done", null, false, false);
  const tMain = task(expEcoli.id, "guest-task-main", "本培養 開始", null, at(monday, 1, 9), at(monday, 1, 10), "done", null, false, false);
  const tWait = task(expEcoli.id, "guest-task-wait", "培養待機", "37℃ / 6h", at(monday, 1, 10), at(monday, 1, 16), "planned", null, false, true);
  const tIptg = task(expEcoli.id, "guest-task-iptg", "IPTG誘導", null, at(monday, 1, 16), at(monday, 1, 16, 30), "planned", null, false, false);
  const tHarvest = task(expEcoli.id, "guest-task-harvest", "菌体回収・遠心", null, at(monday, 2, 9), at(monday, 2, 11), "planned", eqCentrifuge.id, true, false);
  const tSonic = task(expEcoli.id, "guest-task-sonic", "超音波破砕", null, at(monday, 2, 11), at(monday, 2, 12), "planned", null, false, false);
  const tNinta = task(expEcoli.id, "guest-task-ninta", "Ni-NTA 精製", null, at(monday, 3, 10), at(monday, 3, 13), "planned", eqAkta.id, true, false);
  const tSds = task(expEcoli.id, "guest-task-sds", "SDS-PAGE 確認", null, at(monday, 3, 14), at(monday, 3, 17), "planned", null, false, false);
  const tResult = task(expEcoli.id, "guest-task-result", "結果まとめ", null, at(monday, 4, 10), at(monday, 4, 12), "planned", null, false, false);

  // プラスミド抽出＋制限酵素（水曜午後。大腸菌実験と時間帯が重ならない枠）
  const tMini = task(expPlasmid.id, "guest-task-mini", "ミニプレップ", null, at(monday, 2, 13), at(monday, 2, 14), "planned", null, false, false);
  const tRestrict = task(expPlasmid.id, "guest-task-restrict", "制限酵素処理", "37℃", at(monday, 2, 14), at(monday, 2, 15, 30), "planned", null, false, false);
  const tAgarose = task(expPlasmid.id, "guest-task-agarose", "アガロース電気泳動", null, at(monday, 2, 16, 30), at(monday, 2, 17, 30), "planned", null, false, false);
  const tConfirm = task(expPlasmid.id, "guest-task-confirm", "精製・確認", null, at(monday, 2, 17, 30), at(monday, 2, 18, 30), "planned", null, false, false);

  const tasks = [
    tPre, tMain, tWait, tIptg, tHarvest, tSonic, tNinta, tSds, tResult,
    tMini, tRestrict, tAgarose, tConfirm,
  ];

  // ---- 依存関係チェーン ----
  const dep = (
    predecessor: string,
    successor: string,
    gap: number,
  ): TaskDependency => ({
    id: `guest-dep-${predecessor}-${successor}`,
    user_id: u,
    predecessor_id: predecessor,
    successor_id: successor,
    gap_minutes: gap,
    created_at: createdAt,
  });

  const deps: TaskDependency[] = [
    dep(tPre.id, tMain.id, 810), // 前培養→本培養（一晩）
    dep(tMain.id, tWait.id, 0),
    dep(tWait.id, tIptg.id, 0),
    dep(tIptg.id, tHarvest.id, 990), // IPTG誘導→回収（一晩発現）
    dep(tHarvest.id, tSonic.id, 0),
    dep(tSonic.id, tNinta.id, 0),
    dep(tNinta.id, tSds.id, 0),
    dep(tSds.id, tResult.id, 0),
    dep(tMini.id, tRestrict.id, 0),
    dep(tRestrict.id, tAgarose.id, 60), // 制限酵素処理→泳動（反応時間）
    dep(tAgarose.id, tConfirm.id, 0),
  ];

  // ---- 今日の ToDo ----
  const todo = (
    id: string,
    title: string,
    dueISO: string | null,
    done: boolean,
    sortOrder: number,
  ): Todo => ({
    id,
    user_id: u,
    title,
    due_at: dueISO,
    done,
    completed_at: done ? createdAt : null,
    task_id: null,
    sort_order: sortOrder,
    created_at: createdAt,
  });

  const todos: Todo[] = [
    todo("guest-todo-1", "LB培地＋アンピシリンの準備", null, true, 0),
    todo("guest-todo-2", "本培養の吸光度（OD600）を測定", at(monday, 1, 10), false, 1),
    todo("guest-todo-3", "遠心機（水 9:00）の予約を確定", at(monday, 2, 9), false, 2),
    todo("guest-todo-4", "SDS-PAGE 用ゲルの発注", null, false, 3),
  ];

  return {
    equipment: [eqCentrifuge, eqAkta],
    templates: [tplEcoli, tplPlasmid, tplSds],
    templateSteps,
    experiments: [expEcoli, expPlasmid],
    tasks,
    deps,
    todos,
  };
}
