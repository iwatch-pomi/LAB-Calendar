import { describe, it, expect } from "vitest";
import {
  resolveNext,
  afterLoginFrom,
  homeFor,
  destForRole,
  DEFAULT_AFTER_LOGIN,
  TEACHER_HOME,
} from "./authRedirect";

describe("resolveNext", () => {
  it("自サイト内の絶対パスは通す", () => {
    expect(resolveNext("/teacher")).toBe("/teacher");
    expect(resolveNext("/app")).toBe("/app");
    expect(resolveNext("/shared/abc-123")).toBe("/shared/abc-123");
  });

  it("クエリ付きのパスも通す", () => {
    expect(resolveNext("/app?view=week")).toBe("/app?view=week");
  });

  it("外部URLは弾く（オープンリダイレクト対策）", () => {
    expect(resolveNext("https://evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext("http://evil.com")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("プロトコル相対URLは弾く", () => {
    // //evil.com はブラウザには https://evil.com と同じに見える
    expect(resolveNext("//evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext("//evil.com/path")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("バックスラッシュで始まる細工も弾く", () => {
    expect(resolveNext("/\\evil.com")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("相対パスは弾く", () => {
    expect(resolveNext("teacher")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext("../admin")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("空・null・undefined は既定へ", () => {
    expect(resolveNext("")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext(undefined)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("fallback を指定できる", () => {
    expect(resolveNext(null, TEACHER_HOME)).toBe(TEACHER_HOME);
    expect(resolveNext("https://evil.com", TEACHER_HOME)).toBe(TEACHER_HOME);
  });
});

describe("afterLoginFrom", () => {
  it("教授の入口から入った人は教授ページへ", () => {
    expect(afterLoginFrom("/teacher")).toBe(TEACHER_HOME);
  });

  it("カレンダーから入った人はカレンダーへ", () => {
    expect(afterLoginFrom("/app")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("公式サイトなど、それ以外はカレンダーへ", () => {
    expect(afterLoginFrom("/")).toBe(DEFAULT_AFTER_LOGIN);
    expect(afterLoginFrom("/profile")).toBe(DEFAULT_AFTER_LOGIN);
  });
});

describe("homeFor", () => {
  it("教授の戻り先は管理画面", () => {
    expect(homeFor(true)).toBe(TEACHER_HOME);
  });

  it("学生の戻り先はカレンダー", () => {
    expect(homeFor(false)).toBe(DEFAULT_AFTER_LOGIN);
  });
});

describe("destForRole", () => {
  it("学生は指定された行き先のまま", () => {
    expect(destForRole("/app", false)).toBe("/app");
    expect(destForRole("/shared", false)).toBe("/shared");
  });

  it("教授が学生用ホームに行こうとしたら管理画面へ振り替える", () => {
    expect(destForRole("/app", true)).toBe(TEACHER_HOME);
    expect(destForRole("/app?view=week", true)).toBe(TEACHER_HOME);
  });

  it("教授でも明示的な行き先は尊重する", () => {
    // 保護ページから弾かれて next を持って戻ってきた人を勝手に飛ばさない
    expect(destForRole("/shared", true)).toBe("/shared");
    expect(destForRole("/lab", true)).toBe("/lab");
    expect(destForRole(TEACHER_HOME, true)).toBe(TEACHER_HOME);
  });
});
