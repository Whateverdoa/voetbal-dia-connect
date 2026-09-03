"use client";

import type { PitchLayout } from "@/lib/halfPitchLayout";

interface PitchLayoutToggleProps {
  value: PitchLayout;
  onChange: (next: PitchLayout) => void;
  variant?: "light" | "dark";
}

/** Two studio-style buttons to switch between full and half-perspective pitch. */
export function PitchLayoutToggle({
  value,
  onChange,
  variant = "light",
}: PitchLayoutToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ToggleButton
        active={value === "full"}
        variant={variant}
        onClick={() => onChange("full")}
      >
        Vol veld
      </ToggleButton>
      <ToggleButton
        active={value === "halfPerspective"}
        variant={variant}
        onClick={() => onChange("halfPerspective")}
      >
        Half veld
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  variant,
  onClick,
  children,
}: {
  active: boolean;
  variant: "light" | "dark";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const dark = variant === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold min-h-[48px] ${
        active
          ? dark
            ? "bg-white text-dia-green"
            : "bg-dia-black text-white ring-2 ring-dia-green"
          : dark
            ? "bg-white/15 text-white"
            : "bg-dia-green text-white"
      }`}
    >
      {children}
    </button>
  );
}
