/**
 * Idempotent sandbox team for practice matches (no real JO roster).
 *
 *   npx convex run ops/ensureSandboxTeam:apply '{"opsSecret":"...","coachEmail":"you@example.com"}'
 *   npx convex run ops/ensureSandboxTeam:apply '{"opsSecret":"...","coachEmail":"...","createMatch":true}'
 */
import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  generatePublicCode,
  MAX_CODE_GENERATION_ATTEMPTS,
} from "../helpers";
import { assertValidMatchTiming } from "../lib/matchTiming";
import { requireAdminOrOps } from "../lib/opsAuth";
import {
  SANDBOX_TEAM_NAME,
  SANDBOX_TEAM_SLUG,
} from "../lib/sandboxTeam";
import { seasonKeyFromMs } from "../lib/season";
import {
  getUserAccessByEmail,
  upsertUserAccess,
  type AccessRole,
} from "../lib/userAccess";

const PLAYER_BLUEPRINT: Array<{
  name: string;
  number: number;
  positionPrimary: string;
}> = [
  { name: "Test Keeper", number: 1, positionPrimary: "GK" },
  { name: "Test Rechtsback", number: 2, positionPrimary: "RB" },
  { name: "Test Centrale Verdediger A", number: 3, positionPrimary: "CB" },
  { name: "Test Centrale Verdediger B", number: 4, positionPrimary: "CB" },
  { name: "Test Linksback", number: 5, positionPrimary: "LB" },
  { name: "Test Middenveld A", number: 6, positionPrimary: "CDM" },
  { name: "Test Middenveld B", number: 8, positionPrimary: "CM" },
  { name: "Test Middenveld C", number: 10, positionPrimary: "CAM" },
  { name: "Test Rechtsbuiten", number: 7, positionPrimary: "RW" },
  { name: "Test Linksbuiten", number: 11, positionPrimary: "LW" },
  { name: "Test Spits A", number: 9, positionPrimary: "ST" },
  { name: "Test Spits B", number: 14, positionPrimary: "ST" },
  { name: "Test Wissel A", number: 12, positionPrimary: "CM" },
  { name: "Test Wissel B", number: 15, positionPrimary: "CB" },
];

async function uniquePublicCode(ctx: MutationCtx): Promise<string> {
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
  return code;
}

export const apply = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    coachEmail: v.string(),
    /** When true (default), ensure at least one scheduled practice match exists. */
    createMatch: v.optional(v.boolean()),
    opponent: v.optional(v.string()),
  },
  returns: v.object({
    teamId: v.id("teams"),
    teamSlug: v.string(),
    teamName: v.string(),
    coachId: v.id("coaches"),
    coachEmail: v.string(),
    playersCreated: v.number(),
    playersActive: v.number(),
    matchId: v.union(v.id("matches"), v.null()),
    publicCode: v.union(v.string(), v.null()),
    matchCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const coachEmail = args.coachEmail.trim().toLowerCase();
    if (!coachEmail.includes("@")) {
      throw new Error("coachEmail is ongeldig");
    }

    const club =
      (await ctx.db
        .query("clubs")
        .withIndex("by_slug", (q) => q.eq("slug", "dia"))
        .first()) ??
      (await ctx.db.query("clubs").first());
    if (!club) {
      throw new Error("Geen club gevonden — seed eerst een club");
    }

    let team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", SANDBOX_TEAM_SLUG))
      .first();

    if (!team) {
      const teamId = await ctx.db.insert("teams", {
        clubId: club._id,
        name: SANDBOX_TEAM_NAME,
        slug: SANDBOX_TEAM_SLUG,
        createdAt: Date.now(),
      });
      team = await ctx.db.get(teamId);
      if (!team) throw new Error("Sandbox-team aanmaken mislukt");
    } else if (team.name !== SANDBOX_TEAM_NAME) {
      await ctx.db.patch(team._id, { name: SANDBOX_TEAM_NAME });
    }

    const existingPlayers = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    const byNumber = new Map(
      existingPlayers
        .filter((p) => p.number != null)
        .map((p) => [p.number!, p])
    );

    let playersCreated = 0;
    const now = Date.now();
    for (const blueprint of PLAYER_BLUEPRINT) {
      const existing = byNumber.get(blueprint.number);
      if (existing) {
        if (!existing.active || existing.name !== blueprint.name) {
          await ctx.db.patch(existing._id, {
            name: blueprint.name,
            active: true,
            positionPrimary: blueprint.positionPrimary,
          });
        }
        continue;
      }
      await ctx.db.insert("players", {
        teamId: team._id,
        name: blueprint.name,
        number: blueprint.number,
        active: true,
        positionPrimary: blueprint.positionPrimary,
        createdAt: now,
      });
      playersCreated += 1;
    }

    const activePlayers = (
      await ctx.db
        .query("players")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect()
    ).filter((p) => p.active);

    let coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", coachEmail))
      .first();

    if (!coach) {
      const coachId = await ctx.db.insert("coaches", {
        name: "TEST Coach",
        email: coachEmail,
        teamIds: [team._id],
        createdAt: now,
      });
      coach = await ctx.db.get(coachId);
      if (!coach) throw new Error("Coach aanmaken mislukt");
    } else if (!coach.teamIds.includes(team._id)) {
      await ctx.db.patch(coach._id, {
        teamIds: [...coach.teamIds, team._id],
      });
      coach = { ...coach, teamIds: [...coach.teamIds, team._id] };
    }

    const existingAccess = await getUserAccessByEmail(ctx, coachEmail);
    await upsertUserAccess(ctx, {
      email: coachEmail,
      roles: Array.from(
        new Set<AccessRole>([...(existingAccess?.roles ?? []), "coach"])
      ),
      coachId: coach._id,
      refereeId: existingAccess?.refereeId,
      source: "admin_manual",
    });

    const wantMatch = args.createMatch !== false;
    let matchId: Id<"matches"> | null = null;
    let publicCode: string | null = null;
    let matchCreated = false;

    if (wantMatch) {
      const openMatch = (
        await ctx.db
          .query("matches")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect()
      ).find((m) => m.status === "scheduled" || m.status === "lineup");

      if (openMatch) {
        matchId = openMatch._id;
        publicCode = openMatch.publicCode;
        if (openMatch.coachId !== coach._id) {
          await ctx.db.patch(openMatch._id, { coachId: coach._id });
        }
      } else {
        const quarterCount = 4;
        const regulationMinutes = 60;
        assertValidMatchTiming(quarterCount, regulationMinutes);
        const code = await uniquePublicCode(ctx);
        const scheduledAt = Date.now();
        matchId = await ctx.db.insert("matches", {
          teamId: team._id,
          publicCode: code,
          coachId: coach._id,
          opponent: (args.opponent ?? "Test Tegenstander").trim(),
          isHome: true,
          scheduledAt,
          seasonKey: seasonKeyFromMs(scheduledAt),
          status: "scheduled",
          currentQuarter: 1,
          quarterCount,
          homeScore: 0,
          awayScore: 0,
          showLineup: false,
          useBreakClock: true,
          breakClockAutoStart: true,
          venueField: "Testveld",
          createdAt: now,
        });
        publicCode = code;
        matchCreated = true;

        await Promise.all(
          activePlayers.map((player) =>
            ctx.db.insert("matchPlayers", {
              matchId: matchId!,
              playerId: player._id,
              isKeeper: player.positionPrimary === "GK",
              onField: false,
              createdAt: now,
            })
          )
        );
      }
    }

    return {
      teamId: team._id,
      teamSlug: team.slug,
      teamName: SANDBOX_TEAM_NAME,
      coachId: coach._id,
      coachEmail,
      playersCreated,
      playersActive: activePlayers.length,
      matchId,
      publicCode,
      matchCreated,
    };
  },
});
