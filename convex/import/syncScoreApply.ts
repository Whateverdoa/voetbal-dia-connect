/**
 * Apply Sportlink/VA finished scores onto a local match, flagging discrepancies.
 */
import type { Doc } from "../_generated/dataModel";

export type ScoreApplyResult =
  | { kind: "unchanged" }
  | { kind: "applied"; discrepancy: boolean }
  | { kind: "skipped_live" };

export function isLiveOrHalftime(
  status: Doc<"matches">["status"],
): boolean {
  return status === "live" || status === "halftime";
}

/**
 * Sportlink is authoritative for finished fixtures. Overwrite local scores when
 * they differ; record previous local values for admin review.
 */
export function buildFinishedScorePatch(
  match: Pick<
    Doc<"matches">,
    "homeScore" | "awayScore" | "status" | "scoreDiscrepancyAt"
  >,
  homeGoals: number,
  awayGoals: number,
  nowMs: number,
): {
  result: ScoreApplyResult;
  patch: Record<string, number | undefined>;
} {
  if (isLiveOrHalftime(match.status)) {
    return { result: { kind: "skipped_live" }, patch: {} };
  }

  const scoresDiffer =
    match.homeScore !== homeGoals || match.awayScore !== awayGoals;
  const discrepancy = scoresDiffer && (
    match.status === "finished" ||
    match.homeScore !== 0 ||
    match.awayScore !== 0
  );

  const patch: Record<string, number | undefined> = {
    homeScore: homeGoals,
    awayScore: awayGoals,
  };

  if (discrepancy) {
    patch.scoreDiscrepancyAt = nowMs;
    patch.scoreDiscrepancyLocalHome = match.homeScore;
    patch.scoreDiscrepancyLocalAway = match.awayScore;
    patch.scoreDiscrepancySportlinkHome = homeGoals;
    patch.scoreDiscrepancySportlinkAway = awayGoals;
  } else if (match.scoreDiscrepancyAt !== undefined && !scoresDiffer) {
    // Scores now align — clear stale flag
    patch.scoreDiscrepancyAt = undefined;
    patch.scoreDiscrepancyLocalHome = undefined;
    patch.scoreDiscrepancyLocalAway = undefined;
    patch.scoreDiscrepancySportlinkHome = undefined;
    patch.scoreDiscrepancySportlinkAway = undefined;
  }

  return {
    result: { kind: "applied", discrepancy: Boolean(discrepancy) },
    patch,
  };
}
