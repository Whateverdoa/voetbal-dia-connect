/**
 * Upsert Sportlink teams / players / coaches into Convex.
 */
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import {
  getUserAccessByEmail,
  upsertUserAccess,
  type AccessRole,
} from "../lib/userAccess";

const personValidator = v.object({
  displayName: v.string(),
  email: v.union(v.string(), v.null()),
  kind: v.union(v.literal("player"), v.literal("coach")),
  functie: v.union(v.string(), v.null()),
});

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function withCoachRole(existing: AccessRole[] | undefined): AccessRole[] {
  return Array.from(new Set([...(existing ?? []), "coach" as const])).sort() as AccessRole[];
}

export const upsertTeamRoster = internalMutation({
  args: {
    teamSlug: v.string(),
    teamName: v.string(),
    sportlinkTeamCode: v.string(),
    isSelectionTeam: v.optional(v.boolean()),
    people: v.array(personValidator),
    dryRun: v.boolean(),
    /** Deactivate team players not present in this Sportlink indeling (new season cleanup). */
    deactivateMissing: v.optional(v.boolean()),
  },
  returns: v.object({
    teamSlug: v.string(),
    dryRun: v.boolean(),
    createdTeam: v.boolean(),
    playersCreated: v.number(),
    playersSkipped: v.number(),
    playersDeactivated: v.number(),
    coachesCreated: v.number(),
    coachesUpdated: v.number(),
    shieldedSkipped: v.number(),
  }),
  handler: async (ctx, args) => {
    let club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .unique();
    if (!club) {
      if (args.dryRun) {
        return {
          teamSlug: args.teamSlug,
          dryRun: true,
          createdTeam: true,
          playersCreated: args.people.filter((p) => p.kind === "player").length,
          playersSkipped: 0,
          playersDeactivated: 0,
          coachesCreated: args.people.filter((p) => p.kind === "coach").length,
          coachesUpdated: 0,
          shieldedSkipped: 0,
        };
      }
      const clubId = await ctx.db.insert("clubs", {
        name: "DIA",
        slug: "dia",
        createdAt: Date.now(),
      });
      club = await ctx.db.get(clubId);
      if (!club) throw new Error("Kon club DIA niet aanmaken");
    }

    let team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .unique();

    let createdTeam = false;
    if (!team) {
      createdTeam = true;
      if (!args.dryRun) {
        const teamId = await ctx.db.insert("teams", {
          clubId: club._id,
          name: args.teamName,
          slug: args.teamSlug,
          sportlinkTeamCode: args.sportlinkTeamCode,
          isSelectionTeam: args.isSelectionTeam,
          createdAt: Date.now(),
        });
        team = await ctx.db.get(teamId);
      }
    } else if (!args.dryRun) {
      await ctx.db.patch(team._id, {
        sportlinkTeamCode: args.sportlinkTeamCode,
        ...(args.isSelectionTeam !== undefined
          ? { isSelectionTeam: args.isSelectionTeam }
          : {}),
      });
    }

    if (args.dryRun || !team) {
      return {
        teamSlug: args.teamSlug,
        dryRun: args.dryRun,
        createdTeam,
        playersCreated: args.people.filter((p) => p.kind === "player").length,
        playersSkipped: 0,
        playersDeactivated: 0,
        coachesCreated: args.people.filter((p) => p.kind === "coach").length,
        coachesUpdated: 0,
        shieldedSkipped: 0,
      };
    }

    const existingPlayers = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team!._id))
      .collect();
    const playerNames = new Set(existingPlayers.map((p) => normalizeName(p.name)));
    const incomingPlayerNames = new Set(
      args.people
        .filter((p) => p.kind === "player")
        .map((p) => normalizeName(p.displayName))
    );

    let playersCreated = 0;
    let playersSkipped = 0;
    let playersDeactivated = 0;
    const now = Date.now();

    for (const person of args.people.filter((p) => p.kind === "player")) {
      const key = normalizeName(person.displayName);
      const existing = existingPlayers.find((p) => normalizeName(p.name) === key);
      if (existing) {
        if (!existing.active) {
          await ctx.db.patch(existing._id, { active: true });
        }
        playersSkipped++;
        continue;
      }
      await ctx.db.insert("players", {
        teamId: team._id,
        name: person.displayName,
        active: true,
        createdAt: now,
      });
      playerNames.add(key);
      playersCreated++;
    }

    if (args.deactivateMissing) {
      for (const existing of existingPlayers) {
        if (!existing.active) continue;
        if (incomingPlayerNames.has(normalizeName(existing.name))) continue;
        await ctx.db.patch(existing._id, { active: false });
        playersDeactivated++;
      }
    }

    let coachesCreated = 0;
    let coachesUpdated = 0;

    for (const person of args.people.filter((p) => p.kind === "coach")) {
      const email = person.email;
      let coach =
        email
          ? await ctx.db
              .query("coaches")
              .withIndex("by_email", (q) => q.eq("email", email))
              .first()
          : null;

      if (!coach) {
        const all = await ctx.db.query("coaches").collect();
        coach =
          all.find((c) => normalizeName(c.name) === normalizeName(person.displayName)) ??
          null;
      }

      if (!coach) {
        const coachId = await ctx.db.insert("coaches", {
          name: person.displayName,
          email: email ?? undefined,
          teamIds: [team._id],
          createdAt: now,
        });
        if (email) {
          const existingAccess = await getUserAccessByEmail(ctx, email);
          await upsertUserAccess(ctx, {
            email,
            roles: withCoachRole(existingAccess?.roles),
            coachId,
            refereeId: existingAccess?.refereeId,
            source: "coach_sync",
          });
        }
        coachesCreated++;
        continue;
      }

      const teamIds = Array.from(new Set([...coach.teamIds, team._id]));
      await ctx.db.patch(coach._id, {
        teamIds,
        ...(email && !coach.email ? { email } : {}),
      });
      if (email) {
        const existingAccess = await getUserAccessByEmail(ctx, email);
        await upsertUserAccess(ctx, {
          email,
          roles: withCoachRole(existingAccess?.roles),
          coachId: coach._id,
          refereeId: existingAccess?.refereeId,
          source: "coach_sync",
        });
      }
      coachesUpdated++;
    }

    return {
      teamSlug: args.teamSlug,
      dryRun: false,
      createdTeam,
      playersCreated,
      playersSkipped,
      playersDeactivated,
      coachesCreated,
      coachesUpdated,
      shieldedSkipped: 0,
    };
  },
});

/** Ops/admin: grant permanent full access (admin+coach+referee). */
export const grantFullAccess = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    email: v.string(),
  },
  returns: v.object({
    email: v.string(),
    roles: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Ongeldig e-mailadres");

    const existing = await ctx.db
      .query("userAccess")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const roles = ["admin", "coach", "referee"] as const;
    await upsertUserAccess(ctx, {
      email,
      roles: [...roles],
      coachId: existing?.coachId,
      refereeId: existing?.refereeId,
      active: true,
      source: "bootstrap_admin",
    });

    return { email, roles: [...roles] };
  },
});
