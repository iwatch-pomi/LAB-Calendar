import { describe, it, expect } from "vitest";
import { shouldAskRole, isTeacher, type RoleGateState } from "./role";

/** 新規アカウントの初回ログイン＝聞くのが正しい状態 */
const newAccount: RoleGateState = {
  isGuest: false,
  settingsLoaded: true,
  roleChosen: false,
  onboarded: false,
};

describe("shouldAskRole", () => {
  it("新規アカウントの初回ログインでは聞く", () => {
    expect(shouldAskRole(newAccount)).toBe(true);
  });

  it("選択済みなら聞かない", () => {
    expect(shouldAskRole({ ...newAccount, roleChosen: true })).toBe(false);
  });

  it("既存ユーザー（分野選択済み）には聞かない", () => {
    // この条件が無いと、変更を入れた瞬間に全ユーザーへ聞くことになる
    expect(shouldAskRole({ ...newAccount, onboarded: true })).toBe(false);
  });

  it("ゲストには聞かない（設定を保存できないため）", () => {
    expect(shouldAskRole({ ...newAccount, isGuest: true })).toBe(false);
  });

  it("設定が読み込めていないうちは聞かない", () => {
    // 未読込を未選択とみなすと、設定が届くまでの一瞬だけ開いてしまう
    expect(shouldAskRole({ ...newAccount, settingsLoaded: false })).toBe(false);
  });
});

describe("isTeacher", () => {
  it("is_teacher が true のときだけ true", () => {
    expect(isTeacher({ is_teacher: true })).toBe(true);
    expect(isTeacher({ is_teacher: false })).toBe(false);
    expect(isTeacher({})).toBe(false);
    expect(isTeacher(undefined)).toBe(false);
  });
});
