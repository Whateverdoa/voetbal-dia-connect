import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { verifyCoachTeamMembership, verifyClockPin, verifyIsMatchLead } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";

type Ctx = MutationCtx | QueryCtx;

/**
 * Foundation helpers for the "Big One" hierarchy simplification.
 *
 * These helpers centralize role/capability checks so mutations can rely on
 * one place for access control rules.
 */

export async function requireCoachTeamAccess(
  ctx: Ctx,
  match: Doc<"matches"> | null,
  pin: string
): Promise<Doc<"coaches">> {
  if (!match) {
    throw new Error("Invalid match or PIN");
  }
  const coach = await verifyCoachTeamMembership(ctx, match, pin);
  if (!coach) {
    throw new Error("Invalid match or PIN");
  }
  return coach;
}

export async function requireMatchLeadAccess(
  ctx: Ctx,
  match: Doc<"matches"> | null,
  pin: string
): Promise<Doc<"coaches">> {
  if (!match) {
    throw new Error("Invalid match or PIN");
  }
  const leadCoach = await verifyIsMatchLead(ctx, match, pin);
  if (!leadCoach) {
    throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
  }
  return leadCoach;
}

export async function requireClockControlAccess(
  ctx: Ctx,
  match: Doc<"matches"> | null,
  pin: string
): Promise<void> {
  if (!match) {
    throw new Error("Wedstrijd niet gevonden");
  }
  const referee = await fetchRefereeForMatch(ctx, match);
  const allowed = await verifyClockPin(ctx, match, pin, referee);
  if (!allowed) {
    throw new Error("Invalid match or PIN");
  }
}

