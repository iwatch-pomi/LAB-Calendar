import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SENSITIVE_DATA_HINT } from "@/lib/dataPolicy";
import { DATA_POLICY_PATH } from "@/lib/site";

/**
 * 「機密データは入れないでください」の注意書き。
 *
 * 漏えいへの備えとしていちばん効くのは、保存場所を変えることではなく
 * 機密そのものを入れないことなので、入力・共有の場面で繰り返し伝える。
 *
 * ・`card`   … 共有フォームや研究室パネルの上に置く、枠のある注意書き
 * ・`inline` … 入力欄の下に添える1行（文字だけ。レイアウトを押し広げない）
 *
 * 文面は lib/dataPolicy.ts に集約している。画面ごとに書き分けると、
 * あとで文面を直したときに必ずどこかが古いまま残る。
 */
export function SensitiveDataNotice({
  variant = "card",
  children,
}: {
  variant?: "card" | "inline";
  /** 画面ごとに足したい一文（「共有すると相手にも見えます」など） */
  children?: React.ReactNode;
}) {
  const link = (
    <Link
      href={DATA_POLICY_PATH}
      className="whitespace-nowrap font-medium text-brand-600 hover:underline dark:text-brand-400"
    >
      データの取り扱い →
    </Link>
  );

  if (variant === "inline") {
    return (
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        {SENSITIVE_DATA_HINT}
        {children}{" "}
        {link}
      </p>
    );
  }

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <p>
          {SENSITIVE_DATA_HINT}
          {children}
        </p>
        <p className="mt-1">{link}</p>
      </div>
    </div>
  );
}
