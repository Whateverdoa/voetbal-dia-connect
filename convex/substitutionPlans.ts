import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  verifyCoachTeamMembership,
  verifyIsMatchLead,
} from "./pinHelpers";
import { applyBenchSubstitutionWithSlotTransfer } from "./lib/benchSubstitutionCore";
import {
  buildSubstitutionPlanOrderAfterInsert,
  listEnrichedSubstitutionPlans,
  nextSubstitutionPlanSequence,
} from "./lib/substitutionPlanRows";
import { assertCanExecutePlannedSubstitution } from "./lib/substitutionPlanGuards";

async function applyPlannedPositionSwap(
  ctx: MutationCtx,
  matchId: Id<"matches">,
  playerAId: Id<"players">,
  playerBId: Id<"players">
) {
  const mpA = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match_player", (q) =>
      q.eq("matchId", matchId).eq("playerId", playerAId)
    )
    .first();
  const mpB = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match_player", (q) =>
      q.eq("matchId", matchId).eq("playerId", playerBId)
    )
    .first();

  if (!mpA || !mpB) {
    throw new Error("Speler zit niet in deze wedstrijd");
  }
  if (!mpA.onField || !mpB.onField) {
    throw new Error("Beide spelers moeten echt op het veld staan");
  }

  const slotA = mpA.fieldSlotIndex;
  const slotB = mpB.fieldSlotIndex;
  await ctx.db.patch(mpA._id, { fieldSlotIndex: slotB });
  await ctx.db.patch(mpB._id, { fieldSlotIndex: slotA });
}

export const listForMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx: QueryCtx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    if (!(await verifyCoachTeamMembership(ctx, match))) return null;

    return await listEnrichedSubstitutionPlans(ctx, args.matchId);
  },
});

export const addPlanItem = mutation({
  args: {
    matchId: v.id("matches"),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
    kind: v.optional(
      v.union(v.literal("substitution"), v.literal("positionSwap"))
    ),
    targetQuarter: v.optional(v.number()),
    targetMinute: v.optional(v.number()),
    note: v.optional(v.string()),
    insertAtQuarterBoundary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (args.playerOutId === args.playerInId) {
      throw new Error("Kies twee verschillende spelers");
    }
    const kind = args.kind ?? "substitution";

    const mpOut = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerOutId)
      )
      .first();
    const mpIn = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerInId)
      )
      .first();
    if (!mpOut || !mpIn) {
      throw new Error("Speler zit niet in deze wedstrijd");
    }

    const now = Date.now();
    const seq = await nextSubstitutionPlanSequence(ctx, args.matchId);
    const planRow: {
      matchId: Id<"matches">;
      sequence: number;
      kind: "substitution" | "positionSwap";
      playerOutId: Id<"players">;
      playerInId: Id<"players">;
      status: "pending";
      createdAt: number;
      updatedAt: number;
      targetQuarter?: number;
      targetMinute?: number;
      note?: string;
    } = {
      matchId: args.matchId,
      sequence: seq,
      kind,
      playerOutId: args.playerOutId,
      playerInId: args.playerInId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    if (args.targetQuarter !== undefined) {
      planRow.targetQuarter = args.targetQuarter;
    }
    if (args.targetMinute !== undefined) {
      planRow.targetMinute = args.targetMinute;
    }
    if (args.note !== undefined) {
      planRow.note = args.note;
    }
    const id = await ctx.db.insert("substitutionPlans", planRow);

    if (args.insertAtQuarterBoundary) {
      const existingRows = await ctx.db
        .query("substitutionPlans")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();

      const orderedIds = buildSubstitutionPlanOrderAfterInsert(
        existingRows
          .filter((row) => row._id !== id)
          .map((row) => ({
            _id: row._id,
            sequence: row.sequence,
            status: row.status,
            targetQuarter: row.targetQuarter,
          })),
        {
          _id: id,
          sequence: seq,
          status: "pending",
          targetQuarter: args.targetQuarter,
        },
        { insertAtQuarterBoundary: true }
      );

      for (let index = 0; index < orderedIds.length; index += 1) {
        await ctx.db.patch(orderedIds[index], { sequence: index, updatedAt: now });
      }
    }

    return id;
  },
});

export const updatePlanItem = mutation({
  args: {
    planId: v.id("substitutionPlans"),
    targetQuarter: v.optional(v.number()),
    targetMinute: v.optional(v.number()),
    playerOutId: v.optional(v.id("players")),
    playerInId: v.optional(v.id("players")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row) throw new Error("Regel niet gevonden");
    const match = await ctx.db.get(row.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang");
    }
    if (row.status !== "pending") {
      throw new Error("Alleen openstaande regels zijn aan te passen");
    }

    const outId = args.playerOutId ?? row.playerOutId;
    const inId = args.playerInId ?? row.playerInId;
    if (outId === inId) throw new Error("Kies twee verschillende spelers");

    const mpOut = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", row.matchId).eq("playerId", outId)
      )
      .first();
    const mpIn = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", row.matchId).eq("playerId", inId)
      )
      .first();
    if (!mpOut || !mpIn) {
      throw new Error("Speler zit niet in deze wedstrijd");
    }

    const now = Date.now();
    const patch: {
      playerOutId: Id<"players">;
      playerInId: Id<"players">;
      updatedAt: number;
      targetQuarter?: number;
      targetMinute?: number;
      note?: string;
    } = {
      playerOutId: outId,
      playerInId: inId,
      updatedAt: now,
    };
    const nextQuarter = args.targetQuarter ?? row.targetQuarter;
    const nextMinute = args.targetMinute ?? row.targetMinute;
    const nextNote = args.note !== undefined ? args.note : row.note;
    if (nextQuarter !== undefined) {
      patch.targetQuarter = nextQuarter;
    }
    if (nextMinute !== undefined) {
      patch.targetMinute = nextMinute;
    }
    if (nextNote !== undefined) {
      patch.note = nextNote;
    }
    await ctx.db.patch(args.planId, patch);
  },
});

export const removePlanItem = mutation({
  args: { planId: v.id("substitutionPlans") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row) return;
    const match = await ctx.db.get(row.matchId);
    if (!match || !(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang");
    }
    if (row.status !== "pending") {
      throw new Error("Alleen openstaande regels kunnen worden verwijderd");
    }
    const matchId = row.matchId;
    await ctx.db.delete(args.planId);
    const rest = await ctx.db
      .query("substitutionPlans")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .collect();
    rest.sort((a, b) => a.sequence - b.sequence);
    const now = Date.now();
    for (let i = 0; i < rest.length; i += 1) {
      await ctx.db.patch(rest[i]._id, { sequence: i, updatedAt: now });
    }
  },
});

export const reorderPlan = mutation({
  args: {
    matchId: v.id("matches"),
    orderedPlanIds: v.array(v.id("substitutionPlans")),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang");
    }

    const existing = await ctx.db
      .query("substitutionPlans")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const pending = existing.filter((r) => r.status === "pending");
    if (args.orderedPlanIds.length !== pending.length) {
      throw new Error("Volgorde incompleet");
    }
    const idSet = new Set(pending.map((r) => String(r._id)));
    for (const id of args.orderedPlanIds) {
      if (!idSet.has(String(id))) throw new Error("Ongeldige regel in volgorde");
    }

    const now = Date.now();
    for (let index = 0; index < args.orderedPlanIds.length; index += 1) {
      await ctx.db.patch(args.orderedPlanIds[index], {
        sequence: index,
        updatedAt: now,
      });
    }
  },
});

export const skipPlanItem = mutation({
  args: { planId: v.id("substitutionPlans") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.planId);
    if (!row) throw new Error("Regel niet gevonden");
    const match = await ctx.db.get(row.matchId);
    if (!match || !(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang");
    }
    if (row.status !== "pending") {
      throw new Error("Deze regel is al afgehandeld");
    }
    const now = Date.now();
    await ctx.db.patch(args.planId, {
      status: "skipped",
      updatedAt: now,
    });
  },
});

export const executePlanItem = mutation({
  args: {
    planId: v.id("substitutionPlans"),
    correlationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Regel niet gevonden");
    if (plan.status !== "pending") {
      throw new Error("Deze wissel is al uitgevoerd of overgeslagen");
    }

    const match = await ctx.db.get(plan.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    assertCanExecutePlannedSubstitution(match.status);
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
    }

    if ((plan.kind ?? "substitution") === "positionSwap") {
      await applyPlannedPositionSwap(
        ctx,
        plan.matchId,
        plan.playerOutId,
        plan.playerInId
      );
    } else {
      await applyBenchSubstitutionWithSlotTransfer(ctx, {
        matchId: plan.matchId,
        playerOutId: plan.playerOutId,
        playerInId: plan.playerInId,
        correlationId: args.correlationId,
        commandType: "EXECUTE_SUBSTITUTION_PLAN",
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.planId, {
      status: "executed",
      executedAt: now,
      updatedAt: now,
    });
  },
});
