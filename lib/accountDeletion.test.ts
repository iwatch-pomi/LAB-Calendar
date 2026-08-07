import { describe, it, expect } from "vitest";
import {
  daysUntilDeletion,
  isDeletionDue,
  formatDeletionDate,
  DELETION_GRACE_DAYS,
} from "./accountDeletion";

/** JST のローカル時刻から epoch ms（他のテストと同じ流儀） */
function jst(y: number, mo: number, d: number, h = 0, mi = 0): number {
  return Date.UTC(y, mo - 1, d, h - 9, mi);
}

describe("daysUntilDeletion", () => {
  const now = jst(2026, 8, 7, 12);

  it("予約直後は猶予日数と同じだけ残っている", () => {
    const scheduled = new Date(now + DELETION_GRACE_DAYS * 86400000).toISOString();
    expect(daysUntilDeletion(scheduled, now)).toBe(DELETION_GRACE_DAYS);
  });

  it("残りが1日未満でも0日とは出さない", () => {
    // 「あと0日」は、まだ消えていないのに消えたように見える
    const scheduled = new Date(now + 60 * 60 * 1000).toISOString(); // 1時間後
    expect(daysUntilDeletion(scheduled, now)).toBe(1);
  });

  it("予定日時を過ぎたら0", () => {
    const scheduled = new Date(now - 1000).toISOString();
    expect(daysUntilDeletion(scheduled, now)).toBe(0);
  });

  it("端数は切り上げる（26時間なら2日と数えない…ではなく2日）", () => {
    const scheduled = new Date(now + 26 * 60 * 60 * 1000).toISOString();
    expect(daysUntilDeletion(scheduled, now)).toBe(2);
  });

  it("壊れた日時でもクラッシュしない", () => {
    expect(daysUntilDeletion("", now)).toBe(0);
    expect(daysUntilDeletion("not-a-date", now)).toBe(0);
  });
});

describe("isDeletionDue", () => {
  const now = jst(2026, 8, 7, 12);

  it("予定日時を過ぎていれば true（次の定期実行で消える）", () => {
    expect(isDeletionDue(new Date(now - 1).toISOString(), now)).toBe(true);
  });

  it("まだなら false", () => {
    expect(isDeletionDue(new Date(now + 1).toISOString(), now)).toBe(false);
  });

  it("壊れた日時は false（消える予定として扱わない）", () => {
    expect(isDeletionDue("not-a-date", now)).toBe(false);
  });
});

describe("formatDeletionDate", () => {
  it("日本時間の日付と曜日で出す", () => {
    // 2026-08-14 は金曜日
    expect(formatDeletionDate(new Date(jst(2026, 8, 14, 10)).toISOString())).toBe(
      "8月14日(金)",
    );
  });

  it("UTCでは前日になる時刻でも日本時間の日付で出す", () => {
    // JST 8/15 の 08:00 は UTC では 8/14 23:00
    expect(formatDeletionDate(new Date(jst(2026, 8, 15, 8)).toISOString())).toBe(
      "8月15日(土)",
    );
  });

  it("壊れた日時では空文字（画面に NaN を出さない）", () => {
    expect(formatDeletionDate("not-a-date")).toBe("");
  });
});
