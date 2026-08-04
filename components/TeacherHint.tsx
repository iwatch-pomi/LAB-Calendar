"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, X } from "lucide-react";
import { TEACHER_HOME } from "@/lib/authRedirect";

/**
 * 教授として登録している人が `/app`（学生用カレンダー）を開いたときの案内。
 *
 * 自動でリダイレクトはしない。各ページの「カレンダーへ戻る」が `/app` を指すため、
 * 弾き返すと教授はそれらのリンクを押すたびに飛ばされて操作不能になる。
 */
export function TeacherHint() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-800">
      <Users className="h-4 w-4 shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1">
        教授・指導者として登録されています。学生の予定は管理画面から確認できます。
      </span>
      <Link
        href={TEACHER_HOME}
        className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1 font-semibold text-white transition hover:bg-brand-600"
      >
        管理画面へ
      </Link>
      <button
        onClick={() => setClosed(true)}
        title="閉じる"
        className="shrink-0 rounded-lg p-1 text-brand-500 transition hover:bg-brand-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
