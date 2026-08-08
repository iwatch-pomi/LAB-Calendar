"use client";

/**
 * タブバーの中に並べるボタン。
 *
 * 囲む側は次のトレイを用意する:
 *   <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1
 *                   text-sm dark:bg-gray-900 dark:border-gray-800">
 *
 * flex-1 で等分に広がるので、ボタンの数が増えても幅の指定は要らない。
 */
export function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
