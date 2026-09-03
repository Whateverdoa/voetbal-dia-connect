import type { Id } from "@/convex/_generated/dataModel";
import type { PlanMomentTiming } from "./projectSubstitutionMoments";

/** Parse a kleedkamer minute field; empty or invalid → null. */
export function parseMinuteDraft(draft: string): number | null {
  const trimmed = draft.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Overlay a typed minute onto moment timing (new pitch taps). */
export function withMinuteDraft(
  timing: PlanMomentTiming,
  draft: string
): PlanMomentTiming {
  const minute = parseMinuteDraft(draft);
  if (minute == null) return timing;
  return { ...timing, targetMinute: minute, insertAtQuarterBoundary: false };
}

/** Build addPlanItem args from players, moment timing, and optional swap kind. */
type AddPlanPayload = {
  matchId: Id<"matches">;
  playerOutId: Id<"players">;
  playerInId: Id<"players">;
  insertAtQuarterBoundary: boolean;
  kind?: "positionSwap";
  targetQuarter?: number;
  targetMinute?: number;
};

export function addPlanPayload(
  matchId: Id<"matches">,
  playerOutId: Id<"players">,
  playerInId: Id<"players">,
  timing: PlanMomentTiming,
  kind?: "positionSwap"
): AddPlanPayload {
  const payload: AddPlanPayload = {
    matchId,
    playerOutId,
    playerInId,
    insertAtQuarterBoundary: timing.insertAtQuarterBoundary,
  };
  if (kind) payload.kind = kind;
  if (timing.targetQuarter != null) payload.targetQuarter = timing.targetQuarter;
  if (timing.targetMinute != null) payload.targetMinute = timing.targetMinute;
  return payload;
}

/** Pending rows that still need this minute written. */
export function pendingPlanIdsForMinuteUpdate(
  rows: ReadonlyArray<{
    _id: Id<"substitutionPlans">;
    status: string;
    targetMinute?: number | null;
  }>,
  minute: number
): Id<"substitutionPlans">[] {
  return rows
    .filter((row) => row.status === "pending" && row.targetMinute !== minute)
    .map((row) => row._id);
}
