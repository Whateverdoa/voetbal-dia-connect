import clsx from "clsx";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: boolean;
}

export function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 py-3 px-4 rounded-lg font-semibold transition-all",
        "min-h-[48px] active:scale-[0.98] flex items-center justify-center gap-2",
        active
          ? "bg-dia-green text-white shadow-md"
          : "bg-transparent text-gray-600 hover:bg-gray-100"
      )}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}
