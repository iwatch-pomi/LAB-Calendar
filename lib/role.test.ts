import { describe, it, expect } from "vitest";
import {
  shouldAskRole,
  isTeacher,
  resolveTeacherView,
  type RoleGateState,
} from "./role";

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
  it("role が teacher のときだけ true", () => {
    expect(isTeacher("teacher")).toBe(true);
    expect(isTeacher("student")).toBe(false);
    expect(isTeacher(undefined)).toBe(false);
  });

  it("想定外の値は教授扱いしない", () => {
    // サーバーのリダイレクトがこの厳密さに依存している
    expect(isTeacher("Teacher" as never)).toBe(false);
    expect(isTeacher("" as never)).toBe(false);
  });
});

describe("resolveTeacherView", () => {
  it("役割が未読込ならサーバーの値を使う（ちらつき防止）", () => {
    expect(resolveTeacherView(undefined, true)).toBe(true);
    expect(resolveTeacherView(undefined, false)).toBe(false);
  });

  it("読めていればクライアントを優先する（トグルの即時反映）", () => {
    expect(resolveTeacherView("student", true)).toBe(false);
    expect(resolveTeacherView("teacher", false)).toBe(true);
  });
});
