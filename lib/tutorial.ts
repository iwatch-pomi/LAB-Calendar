/**
 * 初回アクセス時のチュートリアルを自動で開くかどうかの判定。
 *
 * 「ゲスト / ログイン後」で既読フラグの保存先が違ううえ、ログイン後は
 * デモデータ選択・分野選択のオーバーレイが先に出るため条件が多い。
 * 静かに壊れると「毎回出る」「二度と出ない」のどちらかになって気付きにくいので、
 * DB にも DOM にも依存しない純粋関数に切り出してテストで固める。
 */
export interface TutorialGateState {
  /** 未ログイン（ゲストモード）か */
  isGuest: boolean;
  /** `?login=1` で戻ってきた＝ログインしに来た人。案内は次の素の訪問に回す */
  cameForLogin: boolean;
  /** ゲストの既読フラグ（localStorage） */
  guestSeen: boolean;
  /** user_settings の読み込みが終わっているか */
  settingsLoaded: boolean;
  /** ログイン後の既読フラグ（features.tutorial_done） */
  tutorialDone: boolean;
  /** デモデータを残すかの確認中 */
  showDemoChoice: boolean;
  /** 研究分野の選択中 */
  showOnboarding: boolean;
}

export function shouldAutoOpenTutorial(s: TutorialGateState): boolean {
  if (s.isGuest) {
    // ゲストは設定を保存できないので localStorage の既読だけで判断する。
    return !s.cameForLogin && !s.guestSeen;
  }
  // ログイン後は設定が読めるまで判断しない（読めていないと未読扱いになり
  // 一瞬だけ開いてしまう）。先に出る2つのオーバーレイが片付いてから出す。
  return (
    s.settingsLoaded &&
    !s.tutorialDone &&
    !s.showDemoChoice &&
    !s.showOnboarding
  );
}
