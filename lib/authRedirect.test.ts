import { describe, it, expect } from "vitest";
import {
  resolveNext,
  afterLoginFrom,
  homeFor,
  destForRole,
  authCallbackUrl,
  serializeNextCookie,
  AUTH_CALLBACK_PATH,
  NEXT_COOKIE,
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

describe("authCallbackUrl", () => {
  it("クエリを一切付けない", () => {
    // Supabase の Redirect URLs 許可リストは既定でクエリまで見るため、
    // ?next=... を付けると素直な登録（.../auth/callback）に一致せず、
    // 黙って Site URL（＝公式サイト）へ飛ばされてログインが完了しない。
    const url = authCallbackUrl("https://labcale.com");
    expect(url).toBe(`https://labcale.com${AUTH_CALLBACK_PATH}`);
    expect(url).not.toContain("?");
  });

  it("origin の末尾スラッシュでパスが二重にならない", () => {
    expect(authCallbackUrl("https://labcale.com/")).toBe(
      "https://labcale.com/auth/callback",
    );
    expect(authCallbackUrl("https://labcale.com//")).toBe(
      "https://labcale.com/auth/callback",
    );
  });

  it("ローカル開発やプレビューでも今いる origin をそのまま使う", () => {
    // 本番ドメインに固定すると、プレビュー環境からのログインが本番へ着地してしまう
    expect(authCallbackUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(authCallbackUrl("https://lab-calendar-abc.vercel.app")).toBe(
      "https://lab-calendar-abc.vercel.app/auth/callback",
    );
  });
});

describe("serializeNextCookie", () => {
  it("往復に必要な属性が揃っている", () => {
    const c = serializeNextCookie("/profile", true);
    expect(c).toContain(`${NEXT_COOKIE}=%2Fprofile`);
    expect(c).toContain("Path=/");
    expect(c).toContain("Max-Age=");
    // OAuth の往復はトップレベルGETなので Lax でも送られる。
    // None にすると Secure 必須になり、ローカルの http で消える。
    expect(c).toContain("SameSite=Lax");
  });

  it("https のときだけ Secure を付ける", () => {
    expect(serializeNextCookie("/profile", true)).toContain("Secure");
    // http のローカル開発で Secure を付けるとブラウザに捨てられる
    expect(serializeNextCookie("/profile", false)).not.toContain("Secure");
  });

  it("値をエスケープする（クエリ付きの行き先でも壊れない）", () => {
    const c = serializeNextCookie("/app?view=week", true);
    expect(c).toContain("%2Fapp%3Fview%3Dweek");
    // 生の ; が混ざると属性として解釈されてしまう
    expect(c.split(";")[0]).not.toContain("?");
  });

  it("cookie 由来の値も resolveNext で外部URLを弾ける", () => {
    // cookie は利用者が書き換えられるので、読む側の検証が最後の砦になる
    expect(resolveNext("https://evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext("//evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(resolveNext("/profile")).toBe("/profile");
  });
});
