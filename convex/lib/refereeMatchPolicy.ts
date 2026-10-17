import { ConvexError } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { guardOfficialClock, nextOfficialClockGuardAt } from "./officialMatchClock";

const guardReference = makeFunctionReference<"mutation", { matchId: Id<"matches">; generation: number }, null>("refereePolicy:guardClock");

/** Legacy commands lack the reviewed version, payload and clock contract. */
export function assertLegacyOfficialWrite(match: Pick<Doc<"matches">, "refereePolicy">) {
  if (match.refereePolicy) throw new ConvexError("Gebruik de nieuwe wedstrijdregistratie voor deze testwedstrijd.");
}

export function projectRefereeClock(match: Doc<"matches">, now: number) {
  const policy = match.refereePolicy;
  if (!policy) return null;
  return guardOfficialClock({ ...policy, status: match.status === "halftime" ? "break" : match.status,
    period: match.currentQuarter, periodCount: match.quarterCount,
    periodMinutes: (match.regulationDurationMinutes ?? 60) / match.quarterCount }, now);
}

/** Save one canonical clock on the existing match; generation invalidates old jobs. */
export async function saveRefereeClock(ctx: MutationCtx, match: Doc<"matches">, now: number) {
  const projection = projectRefereeClock(match, now);
  if (!projection || !match.refereePolicy) throw new ConvexError("CLOCK_POLICY_REQUIRED");
  const { state } = projection;
  const policy = { ...match.refereePolicy, elapsedMs: state.elapsedMs, runningSince: state.runningSince,
    stoppageStartedAt: state.stoppageStartedAt, safetyMarginMinutes: state.safetyMarginMinutes,
    clockReviewReason: state.clockReviewReason, clockLimitAt: state.clockLimitAt,
    clockLimitElapsedMs: state.clockLimitElapsedMs };
  policy.generation = match.refereePolicy.generation + 1;
  if (projection.changed) policy.commandVersion += 1;
  await ctx.db.patch(match._id, { refereePolicy: policy,
    pausedAt: state.runningSince === null && match.status === "live" ? state.stoppageStartedAt ?? projection.effectiveAt ?? now : undefined,
    frozenClockMs: state.runningSince === null ? state.elapsedMs : undefined,
  });
  const nextAt = nextOfficialClockGuardAt(state, now);
  if (nextAt !== undefined) await ctx.scheduler.runAt(Math.max(now, nextAt), guardReference, { matchId: match._id, generation: policy.generation });
  return projection;
}

export async function enforceRefereeClock(ctx: MutationCtx, match: Doc<"matches">, now: number) {
  const projection = projectRefereeClock(match, now);
  if (!projection?.changed) return projection;
  await saveRefereeClock(ctx, match, now);
  await ctx.db.insert("matchEvents", {
    matchId: match._id, type: "clock_guard", quarter: match.currentQuarter,
    matchMs: projection.state.elapsedMs, timestamp: projection.effectiveAt ?? now,
    createdAt: now, actorKind: "system", commandType: "CLOCK_GUARD",
    note: projection.state.clockReviewReason, effectiveAt: projection.effectiveAt,
    observedElapsedMs: projection.observedElapsedMs, observedStoppageMs: projection.observedStoppageMs,
  });
  return projection;
}
