import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { verifyClockPin } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { requireCoachForTeam } from "./lib/userAccess";

const status = v.union(v.literal("scheduled"), v.literal("lineup"), v.literal("live"), v.literal("halftime"), v.literal("finished"));
export const commandArgs = {
  matchId: v.id("matches"),
  correlationId: v.string(),
  command: v.union(v.literal("start"), v.literal("end_period"), v.literal("resume"), v.literal("stop"), v.literal("continue"), v.literal("goal"), v.literal("undo_goal")),
  expectedStatus: status,
  expectedQuarter: v.number(),
  team: v.optional(v.union(v.literal("home"), v.literal("away"))),
  scorerPlayerId: v.optional(v.id("players")),
  goalId: v.optional(v.id("matchEvents")),
};

type CommandArgs = import("convex/values").ObjectType<typeof commandArgs>;

// Wrap the existing match engine in a single transaction. Old web endpoints stay intact.
export async function executeCommand(ctx: MutationCtx, args: CommandArgs): Promise<{ deduped: boolean }> {
  const match = await ctx.db.get(args.matchId);
  if (!match) throw new Error("Wedstrijd niet gevonden");
  if (!(await verifyClockPin(ctx, match))) throw new Error("Geen toegang tot deze wedstrijd");
  const accepted = await consumeCommandIdempotency(ctx, {
    matchId: args.matchId, commandType: `MOBILE_${args.command}`, correlationId: args.correlationId,
  });
  if (!accepted) return { deduped: true };
  if (match.status !== args.expectedStatus || match.currentQuarter !== args.expectedQuarter) {
    throw new Error("De wedstrijd is inmiddels gewijzigd. Controleer de actuele stand en probeer opnieuw.");
  }
  const { matchId } = args;
  switch (args.command) {
    case "start": {
      if (match.status !== "scheduled" && match.status !== "lineup") throw new Error("Deze wedstrijd is al gestart");
      const players = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", matchId)).take(50);
      if (!players.some(p => p.onField && !p.absent && !p.injured)) throw new Error("Zet eerst de opstelling klaar");
      await ctx.runMutation(api.matchActions.start, { matchId });
      break;
    }
    case "end_period":
      if (match.status !== "live") throw new Error("Er loopt geen speelhelft");
      await ctx.runMutation(api.matchActions.nextQuarter, { matchId, correlationId: args.correlationId });
      break;
    case "resume":
      if (match.status !== "halftime") throw new Error("De wedstrijd staat niet in rust");
      await ctx.runMutation(api.matchActions.resumeFromHalftime, { matchId });
      break;
    case "stop":
      await ctx.runMutation(api.matchActions.startStoppage, { matchId });
      break;
    case "continue":
      await ctx.runMutation(api.matchActions.endStoppage, { matchId });
      break;
    case "goal": {
      if (match.status !== "live") throw new Error("Registreer een doelpunt tijdens een speelhelft");
      if (!args.team) throw new Error("Kies het scorende team");
      if (args.scorerPlayerId) {
        const isDia = (args.team === "home") === match.isHome;
        const player = await ctx.db.query("matchPlayers").withIndex("by_match_player", q => q.eq("matchId", matchId).eq("playerId", args.scorerPlayerId!)).unique();
        if (!isDia || !player || player.absent || player.injured) throw new Error("Deze scorer is niet beschikbaar voor dit team");
      }
      await ctx.runMutation(api.matchActions.adjustScore, {
        matchId, team: args.team, delta: 1, correlationId: args.correlationId,
        ...(args.scorerPlayerId ? { scorerPlayerId: args.scorerPlayerId } : {}),
      });
      break;
    }
    case "undo_goal": {
      if (match.status !== "live" && match.status !== "halftime") throw new Error("De wedstrijd is niet actief");
      const goal = await ctx.db.query("matchEvents").withIndex("by_match_type", q => q.eq("matchId", matchId).eq("type", "goal")).order("desc").first();
      if (!goal || goal._id !== args.goalId) throw new Error("Het laatste doelpunt is gewijzigd. Controleer het verloop.");
      // Lightweight score goals have no linked assist rows to undo.
      if (goal.commandType !== "ADJUST_SCORE") throw new Error("Corrigeer dit uitgebreide doelpunt in DIA web");
      const opponent = goal.isOpponentGoal || goal.isOwnGoal;
      const home = opponent ? !match.isHome : match.isHome;
      await ctx.db.patch(matchId, home ? { homeScore: Math.max(0, match.homeScore - 1) } : { awayScore: Math.max(0, match.awayScore - 1) });
      const enrichments = await ctx.db.query("matchEvents").withIndex("by_match_type", q => q.eq("matchId", matchId).eq("type", "goal_enrichment")).take(100);
      for (const event of enrichments) if (event.targetEventId === goal._id) await ctx.db.delete(event._id);
      await ctx.db.delete(goal._id);
      break;
    }
  }
  return { deduped: false };
}

export const command = mutation({ args: commandArgs, returns: v.object({ deduped: v.boolean() }), handler: executeCommand });

export const create = mutation({
  args: {
    teamId: v.id("teams"), opponent: v.string(), isHome: v.boolean(), correlationId: v.string(),
    playerIds: v.array(v.id("players")), starterIds: v.array(v.id("players")), keeperId: v.id("players"),
  },
  returns: v.object({ matchId: v.id("matches"), publicCode: v.string() }),
  handler: async (ctx, args): Promise<{ matchId: import("./_generated/dataModel").Id<"matches">; publicCode: string }> => {
    const { coach } = await requireCoachForTeam(ctx, args.teamId);
    if (!coach.teamIds.includes(args.teamId)) throw new Error("Kies een team waaraan je als coach bent gekoppeld");
    if (!args.correlationId.trim()) throw new Error("Opdrachtcode ontbreekt");
    const previous = await ctx.db.query("matches").withIndex("by_team_mobile_creation", q => q.eq("teamId", args.teamId).eq("mobileCreationId", args.correlationId)).unique();
    if (previous) return { matchId: previous._id, publicCode: previous.publicCode };
    const selected = new Set(args.playerIds);
    const starters = new Set(args.starterIds);
    if (selected.size !== args.playerIds.length || selected.size > 30 || selected.size < 11) throw new Error("Selecteer 11 tot 30 spelers");
    if (starters.size !== 11 || args.starterIds.length !== 11 || !starters.has(args.keeperId)) throw new Error("Kies 11 basisspelers, inclusief een keeper");
    for (const id of starters) if (!selected.has(id)) throw new Error("Basisspeler ontbreekt in de selectie");
    for (const id of selected) {
      const player = await ctx.db.get(id);
      if (!player || player.teamId !== args.teamId || !player.active) throw new Error("Een speler is niet beschikbaar voor dit team");
    }
    const result = await ctx.runMutation(api.matchActions.create, {
      teamId: args.teamId, opponent: args.opponent, isHome: args.isHome,
      playerIds: args.playerIds, quarterCount: 2, regulationDurationMinutes: 60, scheduledAt: Date.now(),
    });
    await ctx.db.patch(result.matchId, {
      mobileCreationId: args.correlationId, leadCoachId: coach._id,
      formationId: "11v11_1-4-3-3", pitchType: "full", breakClockAutoStart: false,
    });
    const ordered = [args.keeperId, ...args.starterIds.filter(id => id !== args.keeperId)];
    const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", result.matchId)).take(31);
    for (const row of rows) {
      const slot = ordered.indexOf(row.playerId);
      await ctx.db.patch(row._id, {
        onField: slot >= 0, isKeeper: row.playerId === args.keeperId,
        ...(slot >= 0 ? { fieldSlotIndex: slot } : {}),
      });
    }
    return result;
  },
});
