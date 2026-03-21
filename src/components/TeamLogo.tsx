"use client";

import { useState } from "react";
import { getLogoInitials } from "@/lib/logos";

const sizes = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
} as const;

interface TeamLogoProps {
  logoUrl: string | null | undefined;
  teamName: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function TeamLogo({
  logoUrl,
  teamName,
  size = "md",
  className = "",
}: TeamLogoProps) {
  const [broken, setBroken] = useState(false);
  const sizeClass = sizes[size];

  if (!logoUrl || broken) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-slate-200 font-semibold text-slate-500 ${sizeClass} ${className}`}
        aria-label={`Logo ${teamName}`}
      >
        {getLogoInitials(teamName)}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`Logo ${teamName}`}
      onError={() => setBroken(true)}
      className={`rounded-md object-contain ${sizeClass} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}
