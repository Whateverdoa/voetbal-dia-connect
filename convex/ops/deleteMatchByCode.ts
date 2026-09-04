/**
 * Delete one finished/scheduled match by public code.
 * npx convex run ops/deleteMatchByCode:apply '{"opsSecret":"...","publicCode":"TNHQ22"}'
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAdminOrOps } from "../lib/opsAuth";

async function deleteIndexed(
  ctx: MutationCtx,
  table:
    | "matchPlayers"
    | "matchEvents"
    | "matchStoppages"
    | "substitutionPlans"
    | "tacticBoards",
  matchId: Id<"matches">
): Promise<number> {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
  return rows.length;
}

export const apply = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    publicCode: v.string(),
  },
  returns: v.object({
    deleted: v.boolean(),
    publicCode: v.string(),
    opponent: v.string(),
    removed: v.object({
      matchPlayers: v.number(),
      matchEvents: v.number(),
      matchStoppages: v.number(),
      substitutionPlans: v.number(),
      tacticBoards: v.number(),
      matchCommandDedupes: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const code = args.publicCode.trim().toUpperCase();
    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", code))
      .first();
    if (!match) {
      throw new Error(`Wedstrijd ${code} niet gevonden`);
    }
    if (!["scheduled", "finished"].includes(match.status)) {
      throw new Error("Kan alleen geplande of afgelopen wedstrijden verwijderen");
    }

    const matchPlayers = await deleteIndexed(ctx, "matchPlayers", match._id);
    const matchEvents = await deleteIndexed(ctx, "matchEvents", match._id);
    const matchStoppages = await deleteIndexed(ctx, "matchStoppages", match._id);
    const substitutionPlans = await deleteIndexed(
      ctx,
      "substitutionPlans",
      match._id
    );
    const tacticBoards = await deleteIndexed(ctx, "tacticBoards", match._id);

    const dedupes = (await ctx.db.query("matchCommandDedupes").collect()).filter(
      (row) => row.matchId === match._id
    );
    await Promise.all(dedupes.map((row) => ctx.db.delete(row._id)));

    await ctx.db.delete(match._id);

    return {
      deleted: true,
      publicCode: code,
      opponent: match.opponent,
      removed: {
        matchPlayers,
        matchEvents,
        matchStoppages,
        substitutionPlans,
        tacticBoards,
        matchCommandDedupes: dedupes.length,
      },
    };
  },
});

export const addMatteoToUpcoming = mutation({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    playerName: v.string(),
    added: v.array(v.string()),
    already: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const players = await ctx.db.query("players").collect();
    const matteo = players.find(
      (p) => p.active && p.name.toLowerCase().includes("matteo")
    );
    if (!matteo) throw new Error("Matteo niet gevonden");

    // Current season started 29 Aug 2026; skip last-season leftovers.
    const seasonStartMs = Date.parse("2026-08-29T00:00:00+02:00");
    const upcoming = (await ctx.db.query("matches").collect()).filter(
      (m) =>
        m.teamId === matteo.teamId &&
        (m.status === "scheduled" || m.status === "lineup") &&
        (m.scheduledAt ?? 0) >= seasonStartMs
    );

    const added: string[] = [];
    const already: string[] = [];
    const now = Date.now();
    for (const match of upcoming) {
      const existing = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", match._id).eq("playerId", matteo._id)
        )
        .first();
      if (existing) {
        already.push(`${match.publicCode} ${match.opponent}`);
        continue;
      }
      await ctx.db.insert("matchPlayers", {
        matchId: match._id,
        playerId: matteo._id,
        isKeeper: false,
        onField: false,
        createdAt: now,
      });
      added.push(`${match.publicCode} ${match.opponent}`);
    }

    return { playerName: matteo.name, added, already };
  },
});

export const matteoCoverage = query({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    players: v.array(
      v.object({
        name: v.string(),
        teamName: v.string(),
        active: v.boolean(),
      })
    ),
    matches: v.array(
      v.object({
        publicCode: v.string(),
        opponent: v.string(),
        status: v.string(),
        scheduledAt: v.union(v.number(), v.null()),
        hasMatteo: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const players = await ctx.db.query("players").collect();
    const matteos = players.filter((p) =>
      p.name.toLowerCase().includes("matteo")
    );
    const teams = await ctx.db.query("teams").collect();
    const teamName = (id: typeof teams[number]["_id"]) =>
      teams.find((t) => t._id === id)?.name ?? "onbekend";

    const teamIds = new Set(matteos.map((p) => p.teamId));
    const matches = (await ctx.db.query("matches").collect())
      .filter((m) => teamIds.has(m.teamId))
      .sort((a, b) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0));

    const matteoIds = new Set(matteos.map((p) => p._id));
    const rows = [];
    for (const match of matches) {
      const mps = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();
      rows.push({
        publicCode: match.publicCode,
        opponent: match.opponent,
        status: match.status,
        scheduledAt: match.scheduledAt ?? null,
        hasMatteo: mps.some((mp) => matteoIds.has(mp.playerId)),
      });
    }

    return {
      players: matteos.map((p) => ({
        name: p.name,
        teamName: teamName(p.teamId),
        active: p.active,
      })),
      matches: rows,
    };
  },
});
