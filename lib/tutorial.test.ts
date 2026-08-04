import { describe, it, expect } from "vitest";
import { shouldAutoOpenTutorial, type TutorialGateState } from "./tutorial";

/** 「ゲストの初回アクセス」＝出るのが正しい状態を土台にする */
const guestFirstVisit: TutorialGateState = {
  isGuest: true,
  cameForLogin: false,
  guestSeen: false,
  settingsLoaded: false,
  tutorialDone: false,
  showDemoChoice: false,
  showOnboarding: false,
};

/** 「ログイン直後の新規アカウント」＝出るのが正しい状態 */
const freshAccount: TutorialGateState = {
  isGuest: false,
  cameForLogin: false,
  guestSeen: false,
  settingsLoaded: true,
  tutorialDone: false,
  showDemoChoice: false,
  showOnboarding: false,
};

describe("shouldAutoOpenTutorial", () => {
  describe("ゲスト", () => {
    it("初回アクセスでは開く", () => {
      expect(shouldAutoOpenTutorial(guestFirstVisit)).toBe(true);
    });

    it("既読なら開かない", () => {
      expect(
        shouldAutoOpenTutorial({ ...guestFirstVisit, guestSeen: true }),
      ).toBe(false);
    });

    it("?login=1 で戻ってきた人には開かない", () => {
      expect(
        shouldAutoOpenTutorial({ ...guestFirstVisit, cameForLogin: true }),
      ).toBe(false);
    });

    it("ログイン側のフラグや設定の読み込み状態には影響されない", () => {
      // ゲストは user_settings を読めないので、これらが何であっても初回は開く
      expect(
        shouldAutoOpenTutorial({
          ...guestFirstVisit,
          settingsLoaded: true,
          tutorialDone: true,
        }),
      ).toBe(true);
    });
  });

  describe("ログイン後", () => {
    it("新規アカウントでは開く", () => {
      expect(shouldAutoOpenTutorial(freshAccount)).toBe(true);
    });

    it("既読（tutorial_done）なら開かない", () => {
      expect(
        shouldAutoOpenTutorial({ ...freshAccount, tutorialDone: true }),
      ).toBe(false);
    });

    it("設定が読み込めていないうちは開かない", () => {
      // 未読込を未読とみなすと、設定が届くまでの一瞬だけ開いてしまう
      expect(
        shouldAutoOpenTutorial({ ...freshAccount, settingsLoaded: false }),
      ).toBe(false);
    });

    it("デモデータの確認中は開かない", () => {
      expect(
        shouldAutoOpenTutorial({ ...freshAccount, showDemoChoice: true }),
      ).toBe(false);
    });

    it("研究分野の選択中は開かない", () => {
      expect(
        shouldAutoOpenTutorial({ ...freshAccount, showOnboarding: true }),
      ).toBe(false);
    });

    it("ゲストの既読フラグには影響されない（引き継ぎは呼び出し側の責務）", () => {
      expect(shouldAutoOpenTutorial({ ...freshAccount, guestSeen: true })).toBe(
        true,
      );
    });
  });
});
