export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
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
      <span className={`${text} font-bold tracking-tight text-gray-800`}>
        ラボカレ
      </span>
    </div>
  );
}
