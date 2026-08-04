export function Logo({
  size = "md",
  themed = true,
}: {
  size?: "sm" | "md" | "lg";
  /**
   * ダークモードに追従するか。/app /teacher など画面がダーク対応の場所では
   * true（既定）。公式サイト（LandingPage）はテーマ選択に関わらず常にライト
   * 固定の画面なので false を渡し、ダークモードのユーザーが訪れても
   * ロゴだけ暗い文字色になって読めなくなる、という事故を防ぐ。
   */
  themed?: boolean;
}) {
  const dim =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dim} grid place-items-center rounded-xl bg-brand-500 font-bold text-white shadow-sm`}
      >
        研
      </div>
      <span
        className={`${text} whitespace-nowrap font-bold tracking-tight text-gray-800 ${
          themed ? "dark:text-gray-100" : ""
        }`}
      >
        ラボカレ
      </span>
    </div>
  );
}
