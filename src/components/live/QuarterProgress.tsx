"use client";

import clsx from "clsx";

interface QuarterProgressProps {
  currentQuarter: number;
  quarterCount: number; // 2 for halves, 4 for quarters
  status: string;
  className?: string;
}

export function QuarterProgress({
  currentQuarter,
  quarterCount,
  status,
  className,
}: QuarterProgressProps) {
  const isFinished = status === "finished";
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isScheduled = status === "scheduled" || status === "lineup";

  // Generate labels based on quarter count
  const labels =
    quarterCount === 2
      ? ["H1", "H2"]
      : ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className={clsx("flex items-center justify-center gap-2", className)}>
      {labels.map((label, index) => {
        const quarterNumber = index + 1;
        const isPast = quarterNumber < currentQuarter || isFinished;
        const isCurrent = quarterNumber === currentQuarter && !isFinished;
        const isFuture = quarterNumber > currentQuarter && !isFinished;

        // Check if this is a halftime break position (between Q2 and Q3 for 4 quarters)
        const showHalftimeIndicator =
          quarterCount === 4 && index === 1 && isHalftime;

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={clsx(
                "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all",
                isPast && "bg-white/30 text-white",
                isCurrent && isLive && "bg-white text-red-600 ring-2 ring-white ring-offset-2 ring-offset-red-600",
                isCurrent && isHalftime && "bg-white text-orange-600 ring-2 ring-white ring-offset-2 ring-offset-orange-500",
                isCurrent && !isLive && !isHalftime && "bg-white/50 text-white",
                isFuture && "bg-white/10 text-white/50",
                isScheduled && "bg-white/10 text-white/50"
              )}
            >
              {label}
            </div>
            {/* Connector line between quarters */}
            {index < labels.length - 1 && (
              <div
                className={clsx(
                  "w-4 h-0.5",
                  isPast ? "bg-white/50" : "bg-white/20"
                )}
              />
            )}
            {/* Halftime indicator */}
            {showHalftimeIndicator && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/70">
                RUST
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
