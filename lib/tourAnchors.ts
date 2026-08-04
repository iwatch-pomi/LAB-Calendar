/**
 * チュートリアルがハイライトする対象を指す目印（data-tour 属性）。
 *
 * 文字列を JSX 側に直接書くと、綴りを間違えても「対象が見つからない」＝
 * 中央表示にフォールバックするだけで静かに劣化する。定数に集約して
 * 型エラーで気付けるようにする。
 */

export const TOUR_ANCHORS = {
  /** ヘッダーの「実験を追加」ボタン（を包む relative な div） */
  addExperiment: "add-experiment",
  /** サイドバーのカレンダー一覧（見出し〜カレンダーを追加まで） */
  experimentList: "experiment-list",
  /** 先頭のカレンダーカードにあるアーカイブボタン */
  experimentArchive: "experiment-archive",
  /** サイドバーの「今日のToDo」セクション（見出し〜一覧まで） */
  todoSection: "todo-section",
  /** サイドバーの「継代培養を管理」リンク（実験モードONのときだけ存在） */
  cultureLink: "culture-link",
  /** サイドバーの「カレンダーを共有」「研究室」リンク（ログイン時のみ存在） */
  shareLinks: "share-links",
  /** サイドバーの「使い方」ボタン */
  helpButton: "help-button",
} as const;

export type TourAnchor = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS];

/** JSX に散らすための属性。`<div {...tourAttr(TOUR_ANCHORS.todoSection)}>` */
export function tourAttr(anchor: TourAnchor): { "data-tour": TourAnchor } {
  return { "data-tour": anchor };
}

/** 目印から要素を引く。無ければ null */
export function findTourTarget(anchor: TourAnchor): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
}
