import { describe, it, expect } from "vitest";
import { buildInvite } from "./inviteMessage";

const base = {
  toEmail: "prof@example.ac.jp",
  fromLabel: "田中",
  appUrl: "https://labocale.example.com",
  scope: "all" as const,
  permission: "comment" as const,
};

describe("buildInvite", () => {
  it("件名に送り主の名前が入る", () => {
    const m = buildInvite(base);
    expect(m.subject).toContain("田中");
    expect(m.subject).toContain("ラボカレ");
  });

  it("本文にアプリのURLが入る", () => {
    const m = buildInvite(base);
    expect(m.body).toContain("https://labocale.example.com");
  });

  it("「同じメールアドレスで登録して」を必ず書く（別アドレスだと共有が効かないため）", () => {
    const m = buildInvite(base);
    expect(m.body).toContain("prof@example.ac.jp");
    expect(m.body).toContain("必ずこのメールアドレス");
    expect(m.body).toContain("別のアドレスで登録すると共有が反映されません");
  });

  it("アカウント全体の共有では「研究の予定」と書く", () => {
    const m = buildInvite(base);
    expect(m.body).toContain("研究の予定");
  });

  it("実験単位の共有ではカレンダー名を出す", () => {
    const m = buildInvite({
      ...base,
      scope: "experiment",
      experimentName: "大腸菌タンパク質発現",
    });
    expect(m.subject).toContain("「大腸菌タンパク質発現」の予定");
    expect(m.body).toContain("「大腸菌タンパク質発現」の予定");
  });

  it("scope=experiment でも名前が無ければ既定の文言に落とす", () => {
    const m = buildInvite({ ...base, scope: "experiment", experimentName: null });
    expect(m.body).toContain("研究の予定");
  });

  it("権限によってできることの説明を出し分ける", () => {
    expect(buildInvite({ ...base, permission: "comment" }).body).toContain(
      "コメント",
    );
    const viewOnly = buildInvite({ ...base, permission: "view" }).body;
    expect(viewOnly).toContain("予定の閲覧ができます");
    expect(viewOnly).not.toContain("コメントができます");
  });

  it("編集できないことを明記する", () => {
    expect(buildInvite(base).body).toContain("書き換えることはできない");
  });

  it("mailto: が宛先・件名・本文を含む形で組まれる", () => {
    const m = buildInvite(base);
    expect(m.mailtoHref.startsWith("mailto:")).toBe(true);
    expect(m.mailtoHref).toContain("subject=");
    expect(m.mailtoHref).toContain("body=");
    // 生の改行やスペースが混ざるとメールソフトが本文を切ってしまう
    expect(m.mailtoHref).not.toMatch(/[\n\r]/);
    expect(m.mailtoHref).not.toMatch(/ /);
  });

  it("mailto: をデコードすると元の件名・本文に戻る", () => {
    const m = buildInvite(base);
    const url = new URL(m.mailtoHref);
    const params = new URLSearchParams(url.search);
    expect(params.get("subject")).toBe(m.subject);
    expect(params.get("body")).toBe(m.body);
    expect(decodeURIComponent(url.pathname)).toBe(base.toEmail);
  });

  it("記号を含む名前や実験名でも壊れない", () => {
    const m = buildInvite({
      ...base,
      fromLabel: "山田 & 佐藤",
      scope: "experiment",
      experimentName: "PCR (95℃/30s) ＋ 電気泳動",
    });
    const params = new URLSearchParams(new URL(m.mailtoHref).search);
    expect(params.get("subject")).toBe(m.subject);
    expect(params.get("body")).toBe(m.body);
    expect(m.body).toContain("PCR (95℃/30s) ＋ 電気泳動");
  });
});
