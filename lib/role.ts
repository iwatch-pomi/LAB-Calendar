import type { UserRole } from "@/lib/types";

/**
 * 利用形態（学生 / 教授）まわりの判定。
 *
 * 役割選択モーダルは `/app` と `/teacher` の両方がマウントするうえ、
 * カレンダー側は「役割を聞いている間は他のオーバーレイを出さない」ために
 * 同じ判定を必要とする。二重に書くとズレるので純粋関数にまとめる。
 */

export interface RoleGateState {
  /** 未ログイン（ゲスト）は設定を保存できないので聞かない */
  isGuest: boolean;
  /** user_settings の読み込みが終わっているか */
  settingsLoaded: boolean;
  /** 選択済みか（features.role_chosen） */
  roleChosen: boolean;
  /**
   * 研究分野の選択を終えているか（features.onboarded）。
   * 既に使っている人は暗黙的に学生なので、ここが true なら聞かない。
   * これを見ないと、この変更を入れた瞬間に既存ユーザー全員へ
   * 「学生か教授か」を聞くことになる。
   */
  onboarded: boolean;
}

export function shouldAskRole(s: RoleGateState): boolean {
  if (s.isGuest) return false;
  if (!s.settingsLoaded) return false;
  return !s.roleChosen && !s.onboarded;
}

/** 教授として使う設定になっているか */
export function isTeacher(role: UserRole | undefined): boolean {
  return role === "teacher";
}

/**
 * 画面に出す利用形態。サーバーで解決した値を初期値にし、クライアントの
 * user_settings.role が読めているときだけそちらを優先する。
 *
 * `useUserRole` は未読込のあいだ undefined を返す。単純に「読めたらクライアント値」に
 * すると、読み込み前の一瞬だけ学生扱いになって画面が切り替わってしまう。逆に常に
 * サーバー値だと利用形態トグルがリロードするまで反映されない。値が確定している
 * ときだけクライアントを採ることで、その両方を避ける。
 */
export function resolveTeacherView(
  clientRole: UserRole | undefined,
  serverIsTeacher: boolean,
): boolean {
  if (clientRole === "teacher") return true;
  if (clientRole === "student") return false;
  return serverIsTeacher;
}
