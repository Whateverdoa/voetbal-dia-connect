"use client";

import clsx from "clsx";

export type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

interface StatusBadgeProps {
  status: MatchStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig: Record<MatchStatus, { label: string; className: string }> = {
  scheduled: {
    label: "Gepland",
    className: "bg-gray-500 text-white",
  },
  lineup: {
    label: "Opstelling",
    className: "bg-blue-500 text-white",
  },
  live: {
    label: "LIVE",
    className: "bg-red-500 text-white animate-pulse",
  },
  halftime: {
    label: "Rust",
    className: "bg-orange-500 text-white",
  },
  finished: {
    label: "Afgelopen",
    className: "bg-gray-800 text-white",
  },
};

export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-full uppercase tracking-wide",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {status === "live" && (
        <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
