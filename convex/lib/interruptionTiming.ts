import { ConvexError, v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
export const interruptionTimingValidator = v.object({
  measurements: v.array(v.object({ id: v.string(), period: v.number(), kind: v.union(v.literal("incident"), v.literal("card"), v.literal("interruption")),
    startedElapsedMs: v.number(), endedElapsedMs: v.optional(v.number()), included: v.optional(v.boolean()) })),
  chosenSeconds: v.record(v.string(), v.number()),
});
export type InterruptionTiming = Infer<typeof interruptionTimingValidator>;
export const emptyTiming = (): InterruptionTiming => ({ measurements: [], chosenSeconds: {} });
export function validateTimingUpdate(match: Doc<"matches">, next: InterruptionTiming, elapsed: number) {
  const old = match.refereePolicy?.interruptionTiming ?? emptyTiming();
  const fail = () => { throw new ConvexError("INTERRUPTION_TIMING_CONFLICT"); };
  if (next.measurements.length > 500 || next.measurements.length < old.measurements.length) fail();
  let end = 0, open = false;
  const ids = new Set<string>();
  for (const [i, item] of next.measurements.entries()) {
    const prior = old.measurements[i];
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.id) || ids.has(item.id.toLowerCase()) || !Number.isInteger(item.period) || item.period < 1 || item.period > match.currentQuarter ||
        !["incident", "card", "interruption"].includes(item.kind) || !Number.isFinite(item.startedElapsedMs) || item.startedElapsedMs < end || item.startedElapsedMs > elapsed || open) fail();
    ids.add(item.id.toLowerCase());
    if (prior) {
      if (prior.id.toLowerCase() !== item.id.toLowerCase() || prior.period !== item.period || prior.kind !== item.kind || prior.startedElapsedMs !== item.startedElapsedMs ||
          (prior.endedElapsedMs !== undefined && prior.endedElapsedMs !== item.endedElapsedMs) ||
          (prior.included !== undefined && prior.included !== item.included)) fail();
    } else if (match.status !== "live" || item.period !== match.currentQuarter ||
      match.refereePolicy?.periodStartedElapsedMs === undefined || item.startedElapsedMs < match.refereePolicy.periodStartedElapsedMs) fail();
    if (item.endedElapsedMs === undefined) {
      if (item.included !== undefined || match.status !== "live" || item.period !== match.currentQuarter || (!prior && match.refereePolicy?.runningSince == null)) fail();
      open = true;
    } else if (!Number.isFinite(item.endedElapsedMs) || item.endedElapsedMs < item.startedElapsedMs || item.endedElapsedMs > elapsed) fail();
    if (prior?.endedElapsedMs === undefined && item.period < match.currentQuarter && item.endedElapsedMs !== match.refereePolicy?.periodStartedElapsedMs) fail();
    end = item.endedElapsedMs ?? item.startedElapsedMs;
  }
  // A long measurement may only become included by a separate, explicit review.
  for (const [i, item] of next.measurements.entries()) {
    const prior = old.measurements[i];
    if (item.endedElapsedMs !== undefined && item.endedElapsedMs - item.startedElapsedMs >= 900_000 &&
        prior?.endedElapsedMs === undefined && item.included !== undefined) fail();
  }
  if (Object.keys(next.chosenSeconds).length > match.quarterCount) fail();
  for (const key of Object.keys(old.chosenSeconds)) if (!(key in next.chosenSeconds)) fail();
  for (const [key, seconds] of Object.entries(next.chosenSeconds)) {
    if (old.chosenSeconds[key] === seconds) continue;
    if (key !== String(match.currentQuarter) || match.status !== "live" || !Number.isInteger(seconds) || seconds < 0 ||
        seconds > (match.refereePolicy?.safetyMarginMinutes ?? 10) * 60 || open ||
        next.measurements.some(m => m.period === match.currentQuarter && m.endedElapsedMs !== undefined && m.included === undefined)) fail();
  }
  return { ...next, measurements: next.measurements.map(item => ({ ...item, id: item.id.toLowerCase() })) };
}
/** Public projection has no local IDs, actor identity or incident comments. */
export function publicInterruptionTiming(timing: InterruptionTiming | undefined, elapsed: number) {
  if (!timing) return undefined;
  return [1, 2, 3, 4].flatMap(period => {
    const rows = timing.measurements.filter(m => m.period === period);
    const chosenSeconds = timing.chosenSeconds[String(period)];
    if (!rows.length && chosenSeconds === undefined) return [];
    const active = rows.find(m => m.endedElapsedMs === undefined);
    return [{ period, measuredMs: rows.reduce((sum, m) => sum + (m.endedElapsedMs === undefined ?
      0 : m.included === true ? m.endedElapsedMs - m.startedElapsedMs : 0), 0),
      activeStartedElapsedMs: active?.startedElapsedMs, active: !!active, needsReview: rows.some(m => m.endedElapsedMs !== undefined && m.included === undefined) || !!active && elapsed - active.startedElapsedMs >= 900_000,
      chosenSeconds }];
  });
}
