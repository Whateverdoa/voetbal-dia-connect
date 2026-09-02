"use client";

import type { PitchLayout } from "@/lib/halfPitchLayout";

interface PitchLayoutToggleProps {
  value: PitchLayout;
  onChange: (next: PitchLayout) => void;
}

/** Two studio-style buttons to switch between full and half-perspective pitch. */
export function PitchLayoutToggle({ value, onChange }: PitchLayoutToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ToggleButton
        active={value === "full"}
        onClick={() => onChange("full")}
      >
        Vol veld
      </ToggleButton>
      <ToggleButton
        active={value === "halfPerspective"}
        onClick={() => onChange("halfPerspective")}
      >
        Half veld
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold min-h-[48px] ${
        active
          ? "bg-dia-black text-dia-yellow ring-2 ring-dia-yellow"
          : "bg-dia-yellow text-black"
      }`}
    >
      {children}
    </button>
  );
}
