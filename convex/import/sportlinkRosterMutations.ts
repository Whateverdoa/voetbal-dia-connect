import { internal } from "../_generated/api";
import { sportlinkPersonId } from "../lib/sportlinkRoster";
/**
 * Upsert Sportlink teams / players / coaches into Convex.
 */
import {
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import {
  getUserAccessByEmail,
  upsertUserAccess,
  type AccessRole,
} from "../lib/userAccess";

const personValidator = v.object({
  displayName: v.string(),
  sportlinkPersonId: v.optional(v.string()),
  email: v.union(v.string(), v.null()),
  kind: v.union(v.literal("player"), v.literal("coach")),
  functie: v.union(v.string(), v.null()),
});

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function withCoachRole(existing: AccessRole[] | undefined): AccessRole[] {
  return Array.from(
    new Set([...(existing ?? []), "coach" as const]),
  ).sort() as AccessRole[];
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
    const playerNames = new Set(
      existingPlayers.map((p) => normalizeName(p.name)),
    );
    const incomingPlayerNames = new Set(
      args.people
        .filter((p) => p.kind === "player")
        .map((p) => normalizeName(p.displayName)),
    );

    let playersCreated = 0;
    let playersSkipped = 0;
    let playersDeactivated = 0;
    const now = Date.now();

    for (const person of args.people.filter((p) => p.kind === "player")) {
      const key = normalizeName(person.displayName);
      const existing = existingPlayers.find(
        (p) => normalizeName(p.name) === key,
      );
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
        sportlinkPersonId: person.sportlinkPersonId,
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
      let coach = email
        ? await ctx.db
            .query("coaches")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first()
        : null;

      if (!coach) {
        const all = await ctx.db.query("coaches").collect();
        coach =
          all.find(
            (c) => normalizeName(c.name) === normalizeName(person.displayName),
          ) ?? null;
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

const publicRosterRowV = v.object({
  personId: v.string(),
  name: v.optional(v.string()),
  photoUrl: v.optional(v.string()),
});
const MAX_ROSTER = 500;
export const listPrivacyTeams = internalQuery({
  args: {},
  returns: v.array(v.object({ teamId: v.id("teams"), teamCode: v.string() })),
  handler: async (ctx) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .unique();
    if (!club) return [];
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .take(65);
    if (teams.length > 64)
      throw new Error("Verdeel privacyverversing over kleinere groepen");
    return teams.flatMap((team) =>
      team.sportlinkTeamCode
        ? [{ teamId: team._id, teamCode: team.sportlinkTeamCode }]
        : [],
    );
  },
});

export const beginPrivacyRefresh = internalMutation({
  args: { teamId: v.id("teams") },
  returns: v.number(),
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team niet gevonden");
    const generation = (team.sportlinkPrivacyGeneration ?? 0) + 1;
    await ctx.db.patch(teamId, {
      sportlinkPrivacyGeneration: generation,
      sportlinkPrivacyObservedAt: Date.now(),
      sportlinkPrivacyValidUntil: 0,
    });
    return generation;
  },
});

export const expirePrivacy = internalMutation({
  args: { teamId: v.id("teams"), generation: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (team?.sportlinkPrivacyGeneration === args.generation) {
      // Date.now alone does not invalidate a cached/reactive Convex query.
      await ctx.db.patch(args.teamId, { sportlinkPrivacyValidUntil: 0 });
    }
    return null;
  },
});

export const applyPrivacySnapshot = internalMutation({
  args: {
    teamId: v.id("teams"),
    teamCode: v.string(),
    generation: v.number(),
    rows: v.array(publicRosterRowV),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (
      !team ||
      team.sportlinkTeamCode !== args.teamCode ||
      team.sportlinkPrivacyGeneration !== args.generation
    )
      return false;
    const expiresAt = (team.sportlinkPrivacyObservedAt ?? 0) + 30 * 60_000;
    if (expiresAt <= Date.now() || args.rows.length > MAX_ROSTER) return false;
    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .take(MAX_ROSTER + 1);
    if (players.length > MAX_ROSTER) throw new Error("Te grote spelerslijst");
    const bindingCounts = new Map<string, number>();
    for (const player of players)
      if (player.sportlinkPersonId)
        bindingCounts.set(
          player.sportlinkPersonId,
          (bindingCounts.get(player.sportlinkPersonId) ?? 0) + 1,
        );
    const rows = new Map(args.rows.map((row) => [row.personId, row]));
    if (rows.size !== args.rows.length)
      throw new Error("Dubbele Sportlink lidcode");
    for (const player of players) {
      const row =
        player.sportlinkPersonId &&
        bindingCounts.get(player.sportlinkPersonId) === 1
          ? rows.get(player.sportlinkPersonId)
          : undefined;
      await ctx.db.patch(player._id, {
        sportlinkPublic: row
          ? {
              ...row,
              teamId: args.teamId,
              teamCode: args.teamCode,
              generation: args.generation,
            }
          : undefined,
      });
    }
    await ctx.db.patch(team._id, { sportlinkPrivacyValidUntil: expiresAt });
    await ctx.scheduler.runAt(
      expiresAt,
      internal.import.sportlinkRosterMutations.expirePrivacy,
      { teamId: team._id, generation: args.generation },
    );
    return true;
  },
});

/** Binding never grants permission: only a subsequent successful source refresh can. */
export const linkPlayerIdentity = mutation({
  args: {
    playerId: v.id("players"),
    personId: v.union(v.string(), v.null()),
    opsSecret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Speler niet gevonden");
    const team = await ctx.db.get(player.teamId);
    if (!team?.sportlinkTeamCode)
      throw new Error("Team heeft geen Sportlink koppeling");
    const personId =
      args.personId === null ? undefined : sportlinkPersonId(args.personId);
    if (personId === null) throw new Error("Ongeldige Sportlink lidcode");
    const peers = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", player.teamId))
      .take(MAX_ROSTER + 1);
    if (peers.length > MAX_ROSTER) throw new Error("Te grote spelerslijst");
    if (
      personId &&
      peers.some(
        (p) => p._id !== player._id && p.sportlinkPersonId === personId,
      )
    )
      throw new Error("Lidcode is al gekoppeld aan een andere speler");
    await ctx.db.patch(player._id, {
      sportlinkPersonId: personId,
      sportlinkPublic: undefined,
    });
    return null;
  },
});
