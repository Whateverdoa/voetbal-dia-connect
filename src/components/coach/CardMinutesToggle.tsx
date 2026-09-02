"use client";

interface CardMinutesToggleProps {
  enabled: boolean;
  onChange: (next: boolean) => void;
  variant?: "light" | "dark";
}

/** Coach-only switch for season minutes on player cards. */
export function CardMinutesToggle({
  enabled,
  onChange,
  variant = "light",
}: CardMinutesToggleProps) {
  const dark = variant === "dark";
  return (
    <label
      className={`flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-medium ${
        dark
          ? "bg-white/10 text-white"
          : "border border-gray-200 bg-white text-gray-800"
      }`}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-5 w-5 ${dark ? "accent-dia-green" : "accent-dia-black"}`}
      />
      Minuten op kaart
    </label>
  );
}
