/**
 * Privacy-redacted substitution plans for presentation / TV queries.
 */
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { redactPlayerForPublic, type ConsentRow } from "./privacyFilter";
import { getCurrentUserAccess } from "./userAccess";

export const presentationPlanValidator = v.object({
  _id: v.id("substitutionPlans"),
  matchId: v.id("matches"),
  sequence: v.number(),
  kind: v.union(v.literal("substitution"), v.literal("positionSwap")),
  targetQuarter: v.union(v.number(), v.null()),
  targetMinute: v.union(v.number(), v.null()),
  playerOutId: v.id("players"),
  playerInId: v.id("players"),
  status: v.union(
    v.literal("pending"),
    v.literal("skipped"),
    v.literal("executed")
  ),
  note: v.union(v.string(), v.null()),
  outDisplayName: v.string(),
  inDisplayName: v.string(),
});

export type PresentationSubstitutionPlan = {
  _id: Id<"substitutionPlans">;
  matchId: Id<"matches">;
  sequence: number;
  kind: "substitution" | "positionSwap";
  targetQuarter: number | null;
  targetMinute: number | null;
  playerOutId: Id<"players">;
  playerInId: Id<"players">;
  status: "pending" | "skipped" | "executed";
  note: string | null;
  outDisplayName: string;
  inDisplayName: string;
};

async function displayNameForPlayer(
  ctx: QueryCtx,
  playerId: Id<"players">
): Promise<string> {
  const player = await ctx.db.get(playerId);
  if (!player) return "?";

  const consents = await ctx.db
    .query("playerConsents")
    .withIndex("by_player", (q) => q.eq("playerId", player._id))
    .collect();

  return redactPlayerForPublic(
    {
      _id: String(player._id),
      name: player.name,
      number: player.number,
      positionPrimary: player.positionPrimary,
      positionSecondary: player.positionSecondary,
      photoUrl: player.photoUrl,
      cardProfile: player.cardProfile,
    },
    consents as ConsentRow[]
  ).displayName;
}

export async function listPresentationSubstitutionPlans(
  ctx: QueryCtx,
  matchId: Id<"matches">
): Promise<PresentationSubstitutionPlan[]> {
  const rows = await ctx.db
    .query("substitutionPlans")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();

  rows.sort(
    (a, b) =>
      a.sequence - b.sequence || String(a._id).localeCompare(String(b._id))
  );

  const out: PresentationSubstitutionPlan[] = [];
  for (const row of rows) {
    const [outDisplayName, inDisplayName] = await Promise.all([
      displayNameForPlayer(ctx, row.playerOutId),
      displayNameForPlayer(ctx, row.playerInId),
    ]);
    out.push({
      _id: row._id,
      matchId: row.matchId,
      sequence: row.sequence,
      kind: row.kind ?? "substitution",
      targetQuarter: row.targetQuarter ?? null,
      targetMinute: row.targetMinute ?? null,
      playerOutId: row.playerOutId,
      playerInId: row.playerInId,
      status: row.status,
      note: row.note ?? null,
      outDisplayName,
      inDisplayName,
    });
  }
  return out;
}

/** Wisselplan is staff-only; public presentation queries get an empty list. */
export async function listStaffPresentationSubstitutionPlans(
  ctx: QueryCtx,
  matchId: Id<"matches">
): Promise<PresentationSubstitutionPlan[]> {
  const access = await getCurrentUserAccess(ctx);
  const roles = access?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("coach")) {
    return [];
  }
  return listPresentationSubstitutionPlans(ctx, matchId);
}
