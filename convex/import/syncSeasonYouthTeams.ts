/**
 * Align youth teams with the official 26-27 teamindeling.
 * Creates missing JO/MO teams. Hides leftover youth teams.
 * Never writes JO13-2 players. Never hides seniors or sandbox.
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import { isFrozenJo132Slug } from "../lib/protectedTeams";
import {
  isYouthTeamSlug,
  normalizeTeamSlug,
  teamNameFromSlug,
} from "../lib/seasonYouthTeams";

const DIA_CLUB_SLUG = "dia";

const applyResult = v.object({
  dryRun: v.boolean(),
  created: v.array(v.string()),
  reactivated: v.array(v.string()),
  hidden: v.array(v.string()),
  playersDeactivated: v.number(),
});

export const apply = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    slugs: v.array(v.string()),
    dryRun: v.boolean(),
  },
  returns: applyResult,
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const listed = new Set(
      args.slugs.map(normalizeTeamSlug).filter((slug) => slug.length > 0),
    );
    listed.add("jo13-2");

    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", DIA_CLUB_SLUG))
      .unique();
    if (!club) {
      throw new Error("DIA-club niet gevonden");
    }

    const teams = await ctx.db.query("teams").collect();
    const bySlug = new Map(teams.map((team) => [team.slug, team]));

    const created: string[] = [];
    const reactivated: string[] = [];
    const hidden: string[] = [];
    let playersDeactivated = 0;

    for (const slug of [...listed].sort()) {
      const existing = bySlug.get(slug);
      if (!existing) {
        if (!args.dryRun) {
          const teamId = await ctx.db.insert("teams", {
            clubId: club._id,
            name: teamNameFromSlug(slug),
            slug,
            active: true,
            createdAt: Date.now(),
          });
          const createdTeam = await ctx.db.get(teamId);
          if (createdTeam) {
            bySlug.set(slug, createdTeam);
          }
        }
        created.push(slug);
        continue;
      }
      if (existing.active === false) {
        if (!args.dryRun) {
          await ctx.db.patch(existing._id, { active: true });
        }
        reactivated.push(slug);
      }
    }

    for (const team of teams) {
      if (!isYouthTeamSlug(team.slug) || listed.has(team.slug)) {
        continue;
      }
      if (isFrozenJo132Slug(team.slug)) {
        continue;
      }
      hidden.push(team.slug);
      if (args.dryRun) {
        continue;
      }
      if (team.active !== false) {
        await ctx.db.patch(team._id, { active: false });
      }
      const players = await ctx.db
        .query("players")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const player of players) {
        if (!player.active) {
          continue;
        }
        await ctx.db.patch(player._id, { active: false });
        playersDeactivated += 1;
      }
    }

    return {
      dryRun: args.dryRun,
      created,
      reactivated,
      hidden: hidden.sort(),
      playersDeactivated,
    };
  },
});
