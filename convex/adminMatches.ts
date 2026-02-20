import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { verifyAdminPin } from "./adminAuth";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";

// --- Queries ---

export const listAllMatches = query({
  args: { adminPin: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    if (args.limit !== undefined && args.limit <= 0) {
      throw new Error("Limiet moet groter zijn dan 0");
    }

    const matchesQuery = ctx.db
      .query("matches")
      .withIndex("by_createdAt")
      .order("desc");
    const matches =
      args.limit !== undefined ? await matchesQuery.take(args.limit) : await matchesQuery.collect();

    // Batch-fetch related data
    const enriched = await Promise.all(
      matches.map(async (match) => {
        // Team + club
        const team = await ctx.db.get(match.teamId);
        const club = team ? await ctx.db.get(team.clubId) : null;

        // Referee (optional)
        let refereeName: string | null = null;
        if (match.refereeId) {
          const referee = await ctx.db.get(match.refereeId);
          refereeName = referee?.name ?? null;
        }

        // Coach (lookup by coachPin via index)
        let coachName: string | null = null;
        const coach = await ctx.db
          .query("coaches")
          .withIndex("by_pin", (q) => q.eq("pin", match.coachPin))
          .first();
        coachName = coach?.name ?? null;

        // Strip sensitive fields before returning to client
        const { coachPin: _pin, ...safeMatch } = match;
        return {
          ...safeMatch,
          teamName: team?.name ?? "Onbekend team",
          clubName: club?.name ?? "Onbekend club",
          refereeName,
          coachName,
        };
      })
    );

    // Sort: live/halftime first, then scheduled (by scheduledAt desc), then finished
    const statusOrder: Record<string, number> = {
      live: 0,
      halftime: 0,
      lineup: 1,
      scheduled: 2,
      finished: 3,
    };

    enriched.sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 9;
      const orderB = statusOrder[b.status] ?? 9;
      if (orderA !== orderB) return orderA - orderB;
      // Within same priority, sort by scheduledAt descending
      const atA = a.scheduledAt ?? 0;
      const atB = b.scheduledAt ?? 0;
      return atB - atA;
    });

    return enriched;
  },
});

// List team players not yet in this match (for pregame add-player in admin)
export const listTeamPlayersNotInMatch = query({
  args: { matchId: v.id("matches"), adminPin: v.string() },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const inMatch = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const inMatchIds = new Set(inMatch.map((mp) => mp.playerId));

    const allTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", match.teamId))
      .collect();

    return allTeam
      .filter((p) => p.active && !inMatchIds.has(p._id))
      .map((p) => ({ id: p._id, name: p.name, number: p.number }));
  },
});

// --- Mutations ---

export const createMatch = mutation({
  args: {
    teamId: v.id("teams"),
    opponent: v.string(),
    isHome: v.boolean(),
    coachPin: v.string(),
    quarterCount: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    refereeId: v.optional(v.id("referees")),
    playerIds: v.array(v.id("players")),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    // Validate inputs
    if (!args.opponent.trim()) {
      throw new Error("Tegenstander mag niet leeg zijn");
    }
    if (args.playerIds.length === 0) {
      throw new Error("Selecteer minimaal één speler");
    }

    // Verify the coachPin belongs to an existing coach
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.coachPin))
      .first();
    if (!coach) {
      throw new Error("Geen coach gevonden met deze PIN");
    }

    // Generate unique public code
    let code = generatePublicCode();
    let attempts = 0;
    while (
      await ctx.db
        .query("matches")
        .withIndex("by_code", (q) => q.eq("publicCode", code))
        .unique()
    ) {
      code = generatePublicCode();
      if (++attempts >= MAX_CODE_GENERATION_ATTEMPTS) {
        throw new Error("Kon geen unieke wedstrijdcode genereren");
      }
    }

    const quarterCount = args.quarterCount ?? 4;

    // Insert match
    const matchId = await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode: code,
      coachPin: args.coachPin,
      opponent: args.opponent.trim(),
      isHome: args.isHome,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      currentQuarter: 1,
      quarterCount,
      homeScore: 0,
      awayScore: 0,
      showLineup: false,
      ...(args.refereeId ? { refereeId: args.refereeId } : {}),
      createdAt: Date.now(),
    });

    // Insert matchPlayers
    await Promise.all(
      args.playerIds.map((playerId) =>
        ctx.db.insert("matchPlayers", {
          matchId,
          playerId,
          isKeeper: false,
          onField: false,
          createdAt: Date.now(),
        })
      )
    );

    return { matchId, publicCode: code };
  },
});

export const updateMatch = mutation({
  args: {
    matchId: v.id("matches"),
    adminPin: v.string(),
    opponent: v.optional(v.string()),
    isHome: v.optional(v.boolean()),
    scheduledAt: v.optional(v.number()),
    refereeId: v.optional(v.union(v.id("referees"), v.null())),
    coachPin: v.optional(v.string()),
    status: v.optional(v.union(v.literal("scheduled"), v.literal("finished"))),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    // Build typed patch object with only provided fields
    type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";
    const patch: Partial<{
      opponent: string;
      isHome: boolean;
      scheduledAt: number;
      refereeId: Id<"referees"> | undefined;
      coachPin: string;
      status: MatchStatus;
      finishedAt: number;
    }> = {};

    if (args.opponent !== undefined) {
      if (!args.opponent.trim()) {
        throw new Error("Tegenstander mag niet leeg zijn");
      }
      patch.opponent = args.opponent.trim();
    }

    if (args.isHome !== undefined) {
      patch.isHome = args.isHome;
    }

    if (args.scheduledAt !== undefined) {
      patch.scheduledAt = args.scheduledAt;
    }

    if (args.refereeId !== undefined) {
      // null means "unassign referee"
      patch.refereeId = args.refereeId === null ? undefined : args.refereeId;
    }

    if (args.coachPin !== undefined) {
      patch.coachPin = args.coachPin;
    }

    if (args.status !== undefined) {
      // Admin can only cancel: scheduled → finished
      if (!(match.status === "scheduled" && args.status === "finished")) {
        throw new Error(
          `Statuswijziging ${match.status} → ${args.status} is niet toegestaan vanuit admin`
        );
      }
      patch.status = args.status;
      patch.finishedAt = Date.now();
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.matchId, patch);
    }

    return { success: true };
  },
});

/**
 * Add an existing team player to a scheduled match. Admin only.
 */
export const addPlayerToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== match.teamId) {
      throw new Error("Speler niet gevonden of hoort niet bij dit team");
    }

    const existing = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();
    if (existing) throw new Error("Speler staat al in de wedstrijd");

    await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId: args.playerId,
      isKeeper: false,
      onField: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a new player and add to a scheduled match. Admin only.
 */
export const createPlayerAndAddToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    name: v.string(),
    number: v.optional(v.number()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Naam is verplicht");

    const playerId = await ctx.db.insert("players", {
      teamId: match.teamId,
      name: trimmed,
      number: args.number,
      positionPrimary: args.positionPrimary,
      positionSecondary: args.positionSecondary,
      active: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId,
      isKeeper: false,
      onField: false,
      createdAt: Date.now(),
    });

    return { playerId };
  },
});

export const deleteMatch = mutation({
  args: {
    matchId: v.id("matches"),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    // Safety: only allow deletion of scheduled or finished matches
    if (!["scheduled", "finished"].includes(match.status)) {
      throw new Error(
        "Kan alleen geplande of afgelopen wedstrijden verwijderen"
      );
    }

    // Cascade delete matchPlayers
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchPlayers.map((mp) => ctx.db.delete(mp._id)));

    // Cascade delete matchEvents
    const matchEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchEvents.map((ev) => ctx.db.delete(ev._id)));

    // Delete match
    await ctx.db.delete(args.matchId);

    return { deleted: true };
  },
});
