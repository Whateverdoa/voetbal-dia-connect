import type { MatchPlayer } from "@/components/match/types";
import { names } from "./planLabels";

interface PlanBenchSummaryProps {
  startingBench: MatchPlayer[];
  projectedBench: MatchPlayer[];
}

/** Two-line bank summary used by both the coach tab and the planscherm. */
export function PlanBenchSummary({
  startingBench,
  projectedBench,
}: PlanBenchSummaryProps) {
  return (
    <div className="grid gap-2 text-sm">
      <div className="rounded-xl bg-gray-50 p-3">
        <span className="font-semibold">Bank bij aftrap:</span>{" "}
        {names(startingBench)}
      </div>
      <div className="rounded-xl bg-blue-50 p-3 text-blue-900">
        <span className="font-semibold">
          Virtuele bank volgens openstaand plan:
        </span>{" "}
        {names(projectedBench)}
      </div>
    </div>
  );
}
