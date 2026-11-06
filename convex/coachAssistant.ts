import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireCoachAccess } from "./lib/userAccess";
import { assistantPlanValidator } from "./lib/coachAssistantValidators";
import { workspacePlan, workspaceRevision, validateWorkspaceSave, type WorkspaceSource } from "./lib/coachAssistantWorkspace";
import { liveProposal, validateLivePreview } from "./lib/coachAssistantLive";
import { verifyIsMatchLead } from "./pinHelpers";

async function readSource(ctx: QueryCtx | MutationCtx, match: Doc<"matches">): Promise<WorkspaceSource> {
  const { coach } = await requireCoachAccess(ctx);
  // Coach Assistant never inherits the club-wide admin override.
  if (!coach.teamIds.includes(match.teamId)) throw new Error("Geen coachtoegang tot deze wedstrijd. Kies een wedstrijd van je eigen coachteams.");
  const entries = await ctx.db.query("matchPlayers").withIndex("by_match", (q) => q.eq("matchId", match._id)).take(31);
  const rows = await ctx.db.query("substitutionPlans").withIndex("by_match", (q) => q.eq("matchId", match._id)).take(301);
  if (entries.length > 30 || rows.length > 300) throw new Error("Deze wedstrijd is te groot voor de Coachassistent (maximaal 30 spelers en 300 regels).");
  const players = await Promise.all(entries.map(async (entry) => {
    const player = await ctx.db.get(entry.playerId);
    if (!player) throw new Error("Een speler uit de wedstrijdselectie ontbreekt. Herstel eerst de selectie in de app.");
    return { entry, player };
  }));
  const custom = match.customFormationTemplateId ? await ctx.db.get(match.customFormationTemplateId) : null;
  if (match.customFormationTemplateId && (!custom || !custom.active || custom.teamId !== match.teamId)) throw new Error("De eigen formatie is niet meer beschikbaar voor dit team.");
  return { match, players, rows, custom };
}

export const workspace = query({
  args: { code: v.string() },
  returns: v.union(v.null(), v.object({
    matchId: v.id("matches"), teamId: v.id("teams"), code: v.string(), teamName: v.string(), opponent: v.string(),
    scheduledAt: v.union(v.number(), v.null()), canSave: v.boolean(), revision: v.string(), plan: assistantPlanValidator,
    preferences: v.array(v.object({ key: v.string(), availability: v.union(v.literal("present"), v.literal("absent"), v.literal("injured")),
      primaryPosition: v.union(v.string(), v.null()), secondaryPosition: v.union(v.string(), v.null()) })), warnings: v.array(v.string()),
  })),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("Vul een wedstrijdcode van zes tekens in.");
    const match = await ctx.db.query("matches").withIndex("by_code", (q) => q.eq("publicCode", code)).unique();
    if (!match) return null;
    const source = await readSource(ctx, match);
    const team = await ctx.db.get(match.teamId);
    const { plan, warnings } = workspacePlan(source);
    return { matchId: match._id, teamId: match.teamId, code: match.publicCode, teamName: team?.name ?? "Team", opponent: match.opponent,
      scheduledAt: match.scheduledAt ?? null, canSave: ["scheduled", "lineup"].includes(match.status) && !match.startedAt && !match.cancelledAt && source.rows.every((r) => r.status === "pending"),
      revision: workspaceRevision(source), plan, warnings,
      preferences: source.players.map(({ entry, player }) => ({ key: String(entry.playerId),
        availability: entry.injured ? "injured" as const : entry.absent ? "absent" as const : "present" as const,
        primaryPosition: player.positionPrimary ?? null, secondaryPosition: player.positionSecondary ?? null })),
    };
  },
});

export const previewRemaining = query({
  // A fresh request key prevents a cached query from reusing an old clock reading.
  args: { matchId: v.id("matches"), intervalMinutes: v.number(), requestId: v.string() },
  returns: v.object({ revision: v.string(), calculatedAt: v.number(), fromSecond: v.number(), plan: assistantPlanValidator,
    totals: v.array(v.object({ key: v.string(), played: v.number(), expected: v.number() })) }),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden.");
    const source = await readSource(ctx, match);
    const result = liveProposal(source, args.intervalMinutes, Date.now());
    return { revision: result.revision, calculatedAt: result.calculatedAt, fromSecond: result.fromSecond, plan: result.plan, totals: result.totals };
  },
});

/** Recompute the reviewed proposal server-side; only pending rows are replaced. */
export const saveRemaining = mutation({
  args: { matchId: v.id("matches"), expectedRevision: v.string(), calculatedAt: v.number(), intervalMinutes: v.number(), reviewed: v.boolean(), requestId: v.string() },
  returns: v.object({ savedItems: v.number(), alreadySaved: v.boolean() }),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden.");
    const source = await readSource(ctx, match);
    if (!(await verifyIsMatchLead(ctx, match))) throw new Error("Alleen de wedstrijdleider kan het vervolgplan overnemen.");
    if (!args.reviewed) throw new Error("Controleer eerst het vervolgplan.");
    if (args.requestId.length < 16 || args.requestId.length > 100) throw new Error("Ongeldige opslagaanvraag.");
    const commandType = "SAVE_ASSISTANT_REMAINING";
    const previous = await ctx.db.query("matchCommandDedupes").withIndex("by_match_command_correlation", (q) =>
      q.eq("matchId", match._id).eq("commandType", commandType).eq("correlationId", args.requestId)).unique();
    if (previous) return { savedItems: source.rows.filter((r) => r.status === "pending").length, alreadySaved: true };
    const now = Date.now();
    validateLivePreview(source, args.expectedRevision, args.calculatedAt, now);
    const proposal = liveProposal(source, args.intervalMinutes, args.calculatedAt);
    const current = liveProposal(source, args.intervalMinutes, now);
    if (proposal.steps.some((step) => step.matchMinute * 60 <= current.fromSecond)) {
      throw new Error("Een voorgestelde wisseltijd is al voorbij. Bereken opnieuw vanaf nu.");
    }
    const done = source.rows.filter((r) => r.status !== "pending");
    const itemCount = proposal.steps.reduce((sum, step) => sum + step.actions.length, 0);
    if (done.length + itemCount > 300) throw new Error("Te veel wisselregels. Kies een langer wisselinterval.");
    for (const row of source.rows) if (row.status === "pending") await ctx.db.delete(row._id);
    let sequence = Math.max(-1, ...done.map((r) => r.sequence)) + 1;
    for (const step of proposal.steps) for (const action of step.actions) {
      const outgoing = source.players.find(({ entry }) => String(entry.playerId) === action.playerOutKey)!;
      const incoming = source.players.find(({ entry }) => String(entry.playerId) === action.playerInKey)!;
      await ctx.db.insert("substitutionPlans", { matchId: match._id, sequence: sequence++, kind: action.kind,
        playerOutId: outgoing.entry.playerId, playerInId: incoming.entry.playerId, targetMinute: step.matchMinute,
        targetQuarter: Math.min(match.quarterCount, Math.floor(step.matchMinute / ((match.regulationDurationMinutes ?? 60) / match.quarterCount)) + 1),
        status: "pending", createdAt: now, updatedAt: now });
    }
    await ctx.db.insert("matchCommandDedupes", { matchId: match._id, commandType, correlationId: args.requestId, createdAt: now });
    return { savedItems: itemCount, alreadySaved: false };
  },
});

/** One transaction: either the complete reviewed plan is saved or nothing changes. */
export const save = mutation({
  args: { matchId: v.id("matches"), expectedRevision: v.string(), reviewed: v.boolean(), requestId: v.string(), plan: assistantPlanValidator },
  returns: v.object({ savedItems: v.number(), alreadySaved: v.boolean(), revision: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden.");
    const source = await readSource(ctx, match);
    if (args.requestId.length < 16 || args.requestId.length > 100) throw new Error("Ongeldige opslagaanvraag.");
    const commandType = "SAVE_ASSISTANT_PLAN";
    const previous = await ctx.db.query("matchCommandDedupes").withIndex("by_match_command_correlation", (q) =>
      q.eq("matchId", match._id).eq("commandType", commandType).eq("correlationId", args.requestId)).unique();
    if (previous) return { savedItems: source.rows.length, alreadySaved: true };
    const plan = validateWorkspaceSave(source, args.plan, args.expectedRevision, args.reviewed);
    const now = Date.now();
    const slots = new Map(plan.startingLineup.field.map((row) => [row.playerKey, row.slotId]));
    for (const { entry } of source.players) {
      const key = String(entry.playerId);
      const player = plan.players.find((row) => row.key === key)!;
      await ctx.db.patch(entry._id, { onField: slots.has(key), fieldSlotIndex: slots.get(key), isKeeper: key === plan.startingLineup.keeperKey,
        absent: Boolean(player.absent && player.unavailableReason !== "injured"), injured: player.unavailableReason === "injured", lastSubbedInAt: undefined });
    }
    const isCustom = plan.formation.id?.startsWith("custom:") === true;
    await ctx.db.patch(match._id, { formationId: isCustom ? match.formationId : plan.formation.id,
      customFormationTemplateId: isCustom ? match.customFormationTemplateId : undefined });
    for (const row of source.rows) await ctx.db.delete(row._id);
    let sequence = 0;
    for (const step of plan.steps) {
      const targetQuarter = Math.min(match.quarterCount, Math.floor(step.matchMinute / ((match.regulationDurationMinutes ?? 60) / match.quarterCount)) + 1);
      for (const action of step.actions) {
        const outgoing = source.players.find(({ entry }) => String(entry.playerId) === action.playerOutKey)!;
        const incoming = source.players.find(({ entry }) => String(entry.playerId) === action.playerInKey)!;
        await ctx.db.insert("substitutionPlans", { matchId: match._id, sequence: sequence++, kind: action.kind,
          playerOutId: outgoing.entry.playerId, playerInId: incoming.entry.playerId, targetMinute: step.matchMinute, targetQuarter,
          status: "pending", createdAt: now, updatedAt: now });
      }
    }
    await ctx.db.insert("matchCommandDedupes", { matchId: match._id, commandType, correlationId: args.requestId, createdAt: now });
    const savedMatch = await ctx.db.get(match._id);
    if (!savedMatch) throw new Error("Wedstrijd niet gevonden.");
    const revision = workspaceRevision(await readSource(ctx, savedMatch));
    return { savedItems: sequence, alreadySaved: false, revision };
  },
});
