import { query, mutation, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdminAccess } from "./adminAuth";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";
import {
  compareAssignmentBoardMatches,
  deriveMatchQualificationTags,
  getAssignmentDateKey,
  getAssignmentDateLabel,
  getQualificationState,
  normalizeQualificationTags,
} from "../src/lib/admin/assignmentBoard";

type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

type AdminMatchRow = Doc<"matches"> & {
  teamName: string;
  clubName: string;
  refereeName: string | null;
  coachName: string | null;
};

type AssignmentBoardRow = Doc<"matches"> & {
  clubId: string;
  clubName: string;
  teamName: string;
  coachName: string | null;
  refereeName: string | null;
  dateKey: string;
  dateLabel: string;
  matchQualificationTags: string[];
  refereeQualificationTags: string[];
  qualificationState: "geschikt" | "mogelijk" | "onbekend";
};

async function getCoachForMatch(
  ctx: QueryCtx,
  coachId?: Id<"coaches"> | null,
): Promise<Doc<"coaches"> | null> {
  if (!coachId) return null;
  return await ctx.db.get(coachId);
}

export const listAllMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<AdminMatchRow[]> => {
    await requireAdminAccess(ctx);
    if (args.limit !== undefined && args.limit <= 0) {
      throw new Error("Limiet moet groter zijn dan 0");
    }

    const matchesQuery = ctx.db
      .query("matches")
      .withIndex("by_createdAt")
      .order("desc");
    const matches =
      args.limit !== undefined
        ? await matchesQuery.take(args.limit)
        : await matchesQuery.collect();

    const enriched: AdminMatchRow[] = await Promise.all(
      matches.map(async (match) => {
        const team = await ctx.db.get(match.teamId);
        const club = team ? await ctx.db.get(team.clubId) : null;
        const referee = match.refereeId ? await ctx.db.get(match.refereeId) : null;
        const coach = await getCoachForMatch(ctx, match.coachId);

        return {
          ...match,
          teamName: team?.name ?? "Onbekend team",
          clubName: club?.name ?? "Onbekend club",
          refereeName: referee?.name ?? null,
          coachName: coach?.name ?? null,
        };
      })
    );

    const statusOrder: Record<string, number> = {
      live: 0,
      halftime: 0,
      lineup: 1,
      scheduled: 2,
      finished: 3,
    };

    enriched.sort((left: AdminMatchRow, right: AdminMatchRow) => {
      const orderLeft = statusOrder[left.status] ?? 9;
      const orderRight = statusOrder[right.status] ?? 9;
      if (orderLeft !== orderRight) return orderLeft - orderRight;

      const atLeft = left.scheduledAt ?? 0;
      const atRight = right.scheduledAt ?? 0;
      return atRight - atLeft;
    });

    return enriched;
  },
});

export const listAssignmentBoard = query({
  handler: async (ctx): Promise<AssignmentBoardRow[]> => {
    await requireAdminAccess(ctx);

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const enriched: AssignmentBoardRow[] = await Promise.all(
      matches.map(async (match) => {
        const team = await ctx.db.get(match.teamId);
        const club = team ? await ctx.db.get(team.clubId) : null;
        const referee = match.refereeId ? await ctx.db.get(match.refereeId) : null;
        const coach = await getCoachForMatch(ctx, match.coachId);

        const teamName = team?.name ?? "Onbekend team";
        const refereeQualificationTags = normalizeQualificationTags(
          referee?.qualificationTags
        );
        const matchQualificationTags = deriveMatchQualificationTags(
          teamName,
          match.quarterCount
        );

        return {
          ...match,
          clubId: team ? String(team.clubId) : "onbekende-club",
          clubName: club?.name ?? "Onbekende club",
          teamName,
          coachName: coach?.name ?? null,
          refereeName: referee?.name ?? null,
          dateKey: getAssignmentDateKey(match.scheduledAt),
          dateLabel: getAssignmentDateLabel(match.scheduledAt),
          matchQualificationTags,
          refereeQualificationTags,
          qualificationState: getQualificationState(
            matchQualificationTags,
            refereeQualificationTags
          ),
        };
      })
    );

    return enriched.sort((left, right) => {
      const clubOrder = left.clubName.localeCompare(right.clubName, "nl-NL");
      if (clubOrder !== 0) return clubOrder;

      if (left.dateKey === "ongepland" && right.dateKey !== "ongepland") return 1;
      if (left.dateKey !== "ongepland" && right.dateKey === "ongepland") return -1;

      const dateOrder = left.dateKey.localeCompare(right.dateKey, "nl-NL");
      if (dateOrder !== 0) return dateOrder;

      return compareAssignmentBoardMatches(left, right);
    });
  },
});

export const listTeamPlayersNotInMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

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
      .filter((player) => player.active && !inMatchIds.has(player._id))
      .map((player) => ({
        id: player._id,
        name: player.name,
        number: player.number,
      }));
  },
});

export const createMatch = mutation({
  args: {
    teamId: v.id("teams"),
    opponent: v.string(),
    isHome: v.boolean(),
    coachId: v.id("coaches"),
    quarterCount: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    refereeId: v.optional(v.id("referees")),
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    if (!args.opponent.trim()) {
      throw new Error("Tegenstander mag niet leeg zijn");
    }
    if (args.playerIds.length === 0) {
      throw new Error("Selecteer minimaal één speler");
    }

    const coach = await ctx.db.get(args.coachId);
    if (!coach) {
      throw new Error("Coach niet gevonden");
    }
    if (!coach.teamIds.includes(args.teamId)) {
      throw new Error("Coach is niet gekoppeld aan dit team");
    }

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
    const matchId = await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode: code,
      coachId: coach._id,
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
    opponent: v.optional(v.string()),
    isHome: v.optional(v.boolean()),
    scheduledAt: v.optional(v.number()),
    refereeId: v.optional(v.union(v.id("referees"), v.null())),
    coachId: v.optional(v.union(v.id("coaches"), v.null())),
    status: v.optional(v.union(v.literal("scheduled"), v.literal("finished"))),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    const patch: Partial<{
      opponent: string;
      isHome: boolean;
      scheduledAt: number;
      refereeId: Id<"referees"> | undefined;
      coachId: Id<"coaches"> | undefined;
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
      patch.refereeId = args.refereeId === null ? undefined : args.refereeId;
    }

    if (args.coachId !== undefined) {
      if (args.coachId === null) {
        patch.coachId = undefined;
      } else {
        const coach = await ctx.db.get(args.coachId);
        if (!coach) {
          throw new Error("Coach niet gevonden");
        }
        patch.coachId = coach._id;
      }
    }

    if (args.status !== undefined) {
      if (!(match.status === "scheduled" && args.status === "finished")) {
        throw new Error(
          `Statuswijziging ${match.status} -> ${args.status} is niet toegestaan vanuit admin`
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

export const addPlayerToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd voor de aftrap");
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

export const createPlayerAndAddToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    name: v.string(),
    number: v.optional(v.number()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd voor de aftrap");
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
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    if (!["scheduled", "finished"].includes(match.status)) {
      throw new Error(
        "Kan alleen geplande of afgelopen wedstrijden verwijderen"
      );
    }

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchPlayers.map((matchPlayer) => ctx.db.delete(matchPlayer._id)));

    const matchEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchEvents.map((event) => ctx.db.delete(event._id)));

    await ctx.db.delete(args.matchId);

    return { deleted: true };
  },
});


