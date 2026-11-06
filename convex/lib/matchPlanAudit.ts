import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getCurrentUserAccess, requireCoachForMatch, requireCoachAccess } from "./userAccess";

type Domain = "lineup" | "plan";
type ArgsWithMatch = { matchId?: Id<"matches">; planId?: Id<"substitutionPlans"> };

async function snapshot(ctx: MutationCtx, matchId: Id<"matches">, domain: Domain) {
  if (domain === "plan") {
    const rows = await ctx.db.query("substitutionPlans").withIndex("by_match", (q) => q.eq("matchId", matchId)).take(1001);
    if (rows.length > 1000) throw new Error("Te veel wisselregels om wijzigingen betrouwbaar vast te leggen.");
    const content = rows.sort((a, b) => a.sequence - b.sequence || String(a._id).localeCompare(String(b._id)))
      .map((row) => [row._id, row.sequence, row.kind ?? "substitution", row.playerOutId, row.playerInId, row.targetMinute, row.targetQuarter, row.status, row.note]);
    return { content: JSON.stringify(content), populated: rows.length > 0 };
  }
  const match = await ctx.db.get(matchId);
  if (!match) throw new Error("Wedstrijd niet gevonden.");
  const rows = await ctx.db.query("matchPlayers").withIndex("by_match", (q) => q.eq("matchId", matchId)).take(101);
  if (rows.length > 100) throw new Error("Te veel spelers om wijzigingen betrouwbaar vast te leggen.");
  const content = rows.sort((a, b) => String(a.playerId).localeCompare(String(b.playerId)))
    .map((row) => [row.playerId, row.onField, row.isKeeper, row.fieldSlotIndex, row.absent ?? false, row.injured ?? false]);
  return { content: JSON.stringify([match.formationId, match.customFormationTemplateId, content]),
    populated: Boolean(match.formationId || match.customFormationTemplateId || rows.some((row) => row.onField)) };
}

/** Wrap the existing authorized handler: audit and edit commit or roll back together. */
export function withPlanAudit<Args extends ArgsWithMatch, Result>(
  domain: Domain | "both", action: string,
  handler: (ctx: MutationCtx, args: Args) => Promise<Result>,
  ownTeamOnly = false,
): (ctx: MutationCtx, args: Args) => Promise<Result> {
  return async (ctx, args) => {
    const matchId = args.matchId ?? (args.planId ? (await ctx.db.get(args.planId))?.matchId : undefined);
    if (!matchId) return handler(ctx, args);
    const sourceMatch = await ctx.db.get(matchId);
    if (!sourceMatch) return handler(ctx, args);
    if (ownTeamOnly) {
      const { coach } = await requireCoachAccess(ctx);
      if (!coach.teamIds.includes(sourceMatch.teamId)) throw new Error("Geen coachtoegang tot deze wedstrijd.");
    } else await requireCoachForMatch(ctx, sourceMatch);
    const domains: Domain[] = domain === "both" ? ["lineup", "plan"] : [domain];
    const before = await Promise.all(domains.map((item) => snapshot(ctx, matchId, item)));
    const result = await handler(ctx, args);
    const after = await Promise.all(domains.map((item) => snapshot(ctx, matchId, item)));
    if (before.every((item, i) => item.content === after[i].content)) return result;
    const identity = await ctx.auth.getUserIdentity();
    const access = await getCurrentUserAccess(ctx);
    if (!identity || !access) throw new Error("Niet ingelogd.");
    // Never use the assigned coach or match lead as a fallback for the actual editor.
    const coach = access.coachId ? await ctx.db.get(access.coachId) : null;
    const actorName = coach?.name?.trim() || identity.name?.trim() || (access.roles.includes("admin") ? "Beheerder (naam ontbreekt)" : "Coach (naam ontbreekt)");
    const actorSubject = identity.subject || identity.tokenIdentifier || access.email;
    for (let i = 0; i < domains.length; i++) {
      if (before[i].content === after[i].content) continue;
      await ctx.db.insert("matchPlanAudit", { matchId, domain: domains[i], actorSubject, actorName, action,
        created: !before[i].populated && after[i].populated, existingBefore: before[i].populated, createdAt: Date.now() });
    }
    return result;
  };
}

export function auditPlanChange<Result>(ctx: MutationCtx, args: ArgsWithMatch, domain: Domain | "both", action: string, handler: () => Promise<Result>, ownTeamOnly = false): Promise<Result> {
  return withPlanAudit(domain, action, handler, ownTeamOnly)(ctx, args);
}
