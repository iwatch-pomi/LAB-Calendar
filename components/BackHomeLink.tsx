import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { homeFor } from "@/lib/authRedirect";

/**
 * 各ページのヘッダーにある「戻る」リンク。
 *
 * 戻り先は利用形態で変わる。教授はカレンダーを持たないので、一律に `/app` を
 * 指していると押すたびにリダイレクトで弾き返され、しかも文言も嘘になる。
 * 行き先とラベルの対応をここ1箇所に閉じ込めて、ページごとにズレないようにする。
 */
export function BackHomeLink({ isTeacher }: { isTeacher: boolean }) {
  return (
    <Link
      href={homeFor(isTeacher)}
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <ChevronLeft className="h-4 w-4" />
      {isTeacher ? "管理画面へ戻る" : "カレンダーへ戻る"}
    </Link>
  );
}
