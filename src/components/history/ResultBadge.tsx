"use client";

import clsx from "clsx";

export type MatchResult = "W" | "D" | "L";

interface ResultBadgeProps {
  result: MatchResult;
}

const config = {
  W: {
    label: "W",
    className: "bg-green-500 text-white",
  },
  D: {
    label: "G",
    className: "bg-gray-400 text-white",
  },
  L: {
    label: "V",
    className: "bg-red-500 text-white",
  },
};

export function ResultBadge({ result }: ResultBadgeProps) {
  const { label, className } = config[result];

  return (
    <span
      className={clsx(
        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
        className
      )}
    >
      {label}
    </span>
  );
}
