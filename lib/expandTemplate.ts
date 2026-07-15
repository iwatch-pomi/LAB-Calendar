// テンプレートを一連のタスク＋依存関係に展開する（クライアント側で使用）。
// 稼働時間・待ち時間・装置の空きを考慮して各ステップを順に配置する。

import {
  findNextAvailableSlot,
  type Interval,
  type WorkingHours,
} from "./reschedule";
import type { TemplateStep } from "./types";

const MIN = 60 * 1000;

export interface PlannedTask {
  tempId: string;
  title: string;
  subtitle: string | null;
  startMs: number;
  endMs: number;
  equipmentName: string | null;
  needsReservation: boolean;
  isWait: boolean;
  stepId: string;
}

export interface PlannedDep {
  predTemp: string;
  succTemp: string;
  gapMinutes: number;
}

export interface ExpandOptions {
  workingHours: WorkingHours;
  tzOffsetMinutes: number;
}

function looksLikeWait(title: string): boolean {
  return /待機|培養待|インキュベート|静置|反応待/.test(title);
}

/**
 * @param steps        テンプレのステップ（step_order 昇順で渡す）
 * @param startMs      実験の開始時刻(epoch ms)
 * @param equipmentBusy 既存タスクの装置占有区間（二重予約回避）
 * @param equipmentIdByName 装置名→id（表示用に name を保持、id は呼び出し側で解決）
 */
export function expandTemplate(
  steps: TemplateStep[],
  startMs: number,
  opts: ExpandOptions,
  equipmentBusy: Interval[] = [],
): { tasks: PlannedTask[]; deps: PlannedDep[] } {
  const { workingHours: wh, tzOffsetMinutes: tz } = opts;
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
  const busy: Interval[] = [...equipmentBusy];
  const tasks: PlannedTask[] = [];
  const deps: PlannedDep[] = [];

  let cursor = startMs;
  let prevTemp: string | null = null;
  let prevWait = 0;

  sorted.forEach((step, i) => {
    const isWait = looksLikeWait(step.title);
    const duration = step.duration_minutes * MIN;
    const earliest = cursor + step.offset_from_prev_minutes * MIN + prevWait * MIN;
    // 装置は名前のみ保持。id 解決は呼び出し側。ここでは名前をキーに競合回避。
    const equipKey = step.equipment_name;
    const equipBusy: Interval[] = equipKey
      ? busy.filter((b) => b.equipmentId === equipKey)
      : [];

    const start = findNextAvailableSlot(
      earliest,
      duration,
      equipKey,
      equipBusy,
      wh,
      tz,
      isWait,
    );
    const end = start + duration;

    const tempId = `t${i}`;
    tasks.push({
      tempId,
      title: step.title,
      subtitle: step.subtitle,
      startMs: start,
      endMs: end,
      equipmentName: equipKey,
      needsReservation: step.needs_reservation,
      isWait,
      stepId: step.id,
    });

    if (equipKey) busy.push({ start, end, equipmentId: equipKey });

    if (prevTemp) {
      deps.push({ predTemp: prevTemp, succTemp: tempId, gapMinutes: prevWait });
    }

    prevTemp = tempId;
    prevWait = step.wait_after_minutes;
    cursor = end;
  });

  return { tasks, deps };
}
