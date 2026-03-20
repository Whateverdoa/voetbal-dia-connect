/**
 * Import all DIA teams, players, and coaches from generated CSV-derived data.
 *
 * Usage:
 *   npx convex run import/importAllTeams:importAll
 */
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { REAL_PLAYER_ROSTERS, ALL_TEAM_SLUGS } from "../seed/realData";
import { TEAM_COACH_DATA } from "../seed/coachData";
import { upsertUserAccess } from "../lib/userAccess";

const DIA_CLUB = { name: "DIA", slug: "dia" } as const;

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function teamNameFromSlug(slug: string): string {
  return slug.toUpperCase();
}

export const upsertTeamPlayers = internalMutation({
  args: {
    teamSlug: v.string(),
    teamName: v.string(),
    players: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", DIA_CLUB.slug))
      .unique();

    if (!club) {
      const clubId = await ctx.db.insert("clubs", {
        name: DIA_CLUB.name,
        slug: DIA_CLUB.slug,
        createdAt: Date.now(),
      });
      club = await ctx.db.get(clubId);
      if (!club) throw new Error("Kon DIA club niet aanmaken");
    }

    let team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .unique();

    let createdTeam = 0;
    if (!team) {
      const teamId = await ctx.db.insert("teams", {
        clubId: club._id,
        name: args.teamName,
        slug: args.teamSlug,
        createdAt: Date.now(),
      });
      team = await ctx.db.get(teamId);
      if (!team) throw new Error(`Kon team niet aanmaken (${args.teamSlug})`);
      createdTeam = 1;
    }

    const existingPlayers = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    const existingByName = new Set(existingPlayers.map((p) => normalizeName(p.name)));

    let createdPlayers = 0;
    for (const playerName of args.players) {
      const normalized = normalizeName(playerName);
      if (!normalized || existingByName.has(normalized)) continue;
      await ctx.db.insert("players", {
        teamId: team._id,
        name: playerName.trim(),
        active: true,
        createdAt: Date.now(),
      });
      existingByName.add(normalized);
      createdPlayers++;
    }

    return {
      teamSlug: args.teamSlug,
      teamId: team._id,
      createdTeam,
      createdPlayers,
    };
  },
});

export const upsertTeamCoaches = internalMutation({
  args: {
    teamSlug: v.string(),
    coaches: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .unique();
    if (!team) {
      return { teamSlug: args.teamSlug, createdCoaches: 0, updatedCoaches: 0 };
    }

    let createdCoaches = 0;
    let updatedCoaches = 0;

    for (const coach of args.coaches) {
      const normalizedEmail = coach.email.trim().toLowerCase();
      if (!normalizedEmail) continue;

      const existing = await ctx.db
        .query("coaches")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();

      let coachId = existing?._id;
      if (!existing) {
        coachId = await ctx.db.insert("coaches", {
          name: coach.name.trim(),
          email: normalizedEmail,
          teamIds: [team._id],
          createdAt: Date.now(),
        });
        createdCoaches++;
      } else {
        const teamIds = existing.teamIds.includes(team._id)
          ? existing.teamIds
          : [...existing.teamIds, team._id];
        await ctx.db.patch(existing._id, {
          name: existing.name || coach.name.trim(),
          teamIds,
        });
        updatedCoaches++;
      }

      if (coachId) {
        await upsertUserAccess(ctx, {
          email: normalizedEmail,
          roles: ["coach"],
          coachId,
          source: "coach_sync",
        });
      }
    }

    return { teamSlug: args.teamSlug, createdCoaches, updatedCoaches };
  },
});

export const importAll = action({
  args: {},
  handler: async (ctx) => {
    let createdTeams = 0;
    let createdPlayers = 0;

    for (const teamSlug of ALL_TEAM_SLUGS) {
      const result = await ctx.runMutation(
        internal.import.importAllTeams.upsertTeamPlayers,
        {
          teamSlug,
          teamName: teamNameFromSlug(teamSlug),
          players: REAL_PLAYER_ROSTERS[teamSlug] ?? [],
        },
      );
      createdTeams += result.createdTeam;
      createdPlayers += result.createdPlayers;
    }

    let createdCoaches = 0;
    let updatedCoaches = 0;
    for (const teamData of TEAM_COACH_DATA) {
      const result = await ctx.runMutation(
        internal.import.importAllTeams.upsertTeamCoaches,
        teamData,
      );
      createdCoaches += result.createdCoaches;
      updatedCoaches += result.updatedCoaches;
    }

    return {
      totalTeamsInSource: ALL_TEAM_SLUGS.length,
      totalCoachTeamRows: TEAM_COACH_DATA.length,
      createdTeams,
      createdPlayers,
      createdCoaches,
      updatedCoaches,
    };
  },
});
