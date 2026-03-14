import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  verifyCoachTeamMembership,
  verifyClockAccess,
  verifyIsMatchLead,
} from "./pinHelpers";
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
): Promise<Doc<"coaches">> {
  if (!match) {
    throw new Error("Wedstrijd niet gevonden");
  }
  const coach = await verifyCoachTeamMembership(ctx, match);
  if (!coach) {
    throw new Error("Geen coachtoegang voor deze wedstrijd");
  }
  return coach;
}

export async function requireMatchLeadAccess(
  ctx: Ctx,
  match: Doc<"matches"> | null,
): Promise<Doc<"coaches">> {
  if (!match) {
    throw new Error("Wedstrijd niet gevonden");
  }
  const leadCoach = await verifyIsMatchLead(ctx, match);
  if (!leadCoach) {
    throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
  }
  return leadCoach;
}

export async function requireClockControlAccess(
  ctx: Ctx,
  match: Doc<"matches"> | null,
): Promise<void> {
  if (!match) {
    throw new Error("Wedstrijd niet gevonden");
  }
  const referee = await fetchRefereeForMatch(ctx, match);
  const allowed = await verifyClockAccess(ctx, match, referee);
  if (!allowed) {
    throw new Error("Geen rechten om de klok te bedienen");
  }
}

