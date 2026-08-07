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
  it("is_teacher が true のときだけ true", () => {
    expect(isTeacher({ is_teacher: true })).toBe(true);
    expect(isTeacher({ is_teacher: false })).toBe(false);
    expect(isTeacher({})).toBe(false);
    expect(isTeacher(undefined)).toBe(false);
  });

  it("true 以外の値（文字列など）は教授扱いしない", () => {
    // サーバーのリダイレクトがこの厳密さに依存している
    expect(isTeacher({ is_teacher: "true" } as never)).toBe(false);
  });
});

describe("resolveTeacherView", () => {
  it("設定が未読込ならサーバーの値を使う（ちらつき防止）", () => {
    expect(resolveTeacherView(undefined, true)).toBe(true);
    expect(resolveTeacherView(undefined, false)).toBe(false);
  });

  it("設定が読めなかった（{}）ときもサーバーの値を維持する", () => {
    // useSettings はエラーを握り潰して {} を返すので、ここで学生に倒すと
    // 一時的な失敗だけで教授が学生用ページに戻ってしまう
    expect(resolveTeacherView({}, true)).toBe(true);
  });

  it("明示的な値があればクライアントを優先する（トグルの即時反映）", () => {
    expect(resolveTeacherView({ is_teacher: false }, true)).toBe(false);
    expect(resolveTeacherView({ is_teacher: true }, false)).toBe(true);
  });
});
