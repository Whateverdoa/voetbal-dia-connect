import { query } from "./_generated/server";
import { v } from "convex/values";
import { redactPlayerForPublic } from "./lib/privacyFilter";
import type { ConsentRow } from "./lib/privacyFilter";
import {
  listStaffPresentationSubstitutionPlans,
  presentationPlanValidator,
} from "./lib/presentationSubstitutionPlans";
import { pickPresentMatch } from "./lib/pickPresentMatch";
import {
  customFormationValidator,
  loadCustomFormationForMatch,
} from "./lib/presentationFormation";

export const getTeamPresentation = query({
  args: { teamSlug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      teamId: v.id("teams"),
      teamName: v.string(),
      teamSlug: v.string(),
      isSelectionTeam: v.boolean(),
      logoUrl: v.union(v.string(), v.null()),
      liveMatch: v.union(
        v.null(),
        v.object({
          matchId: v.id("matches"),
          publicCode: v.string(),
          opponent: v.string(),
          isHome: v.boolean(),
          status: v.string(),
          homeScore: v.number(),
          awayScore: v.number(),
          formationId: v.union(v.string(), v.null()),
          showLineup: v.boolean(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .first();
    if (!team) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    const live = pickPresentMatch(matches);

    return {
      teamId: team._id,
      teamName: team.name,
      teamSlug: team.slug,
      isSelectionTeam: team.isSelectionTeam === true,
      logoUrl: team.logoUrl ?? null,
      liveMatch: live
        ? {
            matchId: live._id,
            publicCode: live.publicCode,
            opponent: live.opponent,
            isHome: live.isHome,
            status: live.status,
            homeScore: live.homeScore,
            awayScore: live.awayScore,
            formationId: live.formationId ?? null,
            showLineup: live.showLineup,
          }
        : null,
    };
  },
});

export const getMatchPresentation = query({
  args: { publicCode: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      matchId: v.id("matches"),
      publicCode: v.string(),
      teamId: v.id("teams"),
      teamName: v.string(),
      teamSlug: v.string(),
      isSelectionTeam: v.boolean(),
      opponent: v.string(),
      isHome: v.boolean(),
      status: v.string(),
      homeScore: v.number(),
      awayScore: v.number(),
      currentQuarter: v.number(),
      quarterCount: v.number(),
      formationId: v.union(v.string(), v.null()),
      customFormationTemplateId: v.union(
        v.id("formationTemplates"),
        v.null()
      ),
      customFormation: customFormationValidator,
      showLineup: v.boolean(),
      quarterStartedAt: v.union(v.number(), v.null()),
      pausedAt: v.union(v.number(), v.null()),
      accumulatedPauseTime: v.union(v.number(), v.null()),
      frozenClockMs: v.union(v.number(), v.null()),
      players: v.array(
        v.object({
          playerId: v.string(),
          displayName: v.string(),
          number: v.union(v.number(), v.null()),
          positionPrimary: v.union(v.string(), v.null()),
          positionSecondary: v.union(v.string(), v.null()),
          photoUrl: v.union(v.string(), v.null()),
          cardProfile: v.union(
            v.object({
              xp: v.number(),
              level: v.number(),
              rarity: v.union(
                v.literal("common"),
                v.literal("rare"),
                v.literal("epic")
              ),
              seasonStats: v.object({
                matches: v.number(),
                minutes: v.number(),
                goals: v.number(),
                assists: v.number(),
                cleanSheets: v.number(),
              }),
              badges: v.optional(v.array(v.string())),
            }),
            v.null()
          ),
          showFullIdentity: v.boolean(),
          onField: v.boolean(),
          fieldSlotIndex: v.union(v.number(), v.null()),
          isKeeper: v.boolean(),
          absent: v.boolean(),
        })
      ),
      substitutionPlans: v.array(presentationPlanValidator),
    })
  ),
  handler: async (ctx, args) => {
    const code = args.publicCode.trim().toUpperCase();
    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", code))
      .unique();
    if (!match) return null;

    const team = await ctx.db.get(match.teamId);
    if (!team) return null;

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    const players = [];
    for (const mp of matchPlayers) {
      const player = await ctx.db.get(mp.playerId);
      if (!player) continue;

      const consents = await ctx.db
        .query("playerConsents")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();

      const redacted = redactPlayerForPublic(
        {
          _id: String(player._id),
          name: player.name,
          number: player.number,
          positionPrimary: player.positionPrimary,
          positionSecondary: player.positionSecondary,
          photoUrl: player.photoUrl,
          cardProfile: player.cardProfile,
        },
        consents as ConsentRow[]
      );

      players.push({
        ...redacted,
        onField: mp.onField,
        fieldSlotIndex: mp.fieldSlotIndex ?? null,
        isKeeper: mp.isKeeper,
        absent: mp.absent ?? false,
      });
    }

    const substitutionPlans = await listStaffPresentationSubstitutionPlans(
      ctx,
      match._id
    );

    return {
      matchId: match._id,
      publicCode: match.publicCode,
      teamId: team._id,
      teamName: team.name,
      teamSlug: team.slug,
      isSelectionTeam: team.isSelectionTeam === true,
      opponent: match.opponent,
      isHome: match.isHome,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      currentQuarter: match.currentQuarter,
      quarterCount: match.quarterCount,
      formationId: match.formationId ?? null,
      customFormationTemplateId: match.customFormationTemplateId ?? null,
      customFormation: await loadCustomFormationForMatch(ctx, match),
      showLineup: match.showLineup,
      quarterStartedAt: match.quarterStartedAt ?? null,
      pausedAt: match.pausedAt ?? null,
      accumulatedPauseTime: match.accumulatedPauseTime ?? null,
      frozenClockMs: match.frozenClockMs ?? null,
      players,
      substitutionPlans,
    };
  },
});

export const getTeamDeckPublic = query({
  args: { teamSlug: v.string() },
  returns: v.array(
    v.object({
      playerId: v.string(),
      displayName: v.string(),
      number: v.union(v.number(), v.null()),
      positionPrimary: v.union(v.string(), v.null()),
      positionSecondary: v.union(v.string(), v.null()),
      photoUrl: v.union(v.string(), v.null()),
      cardProfile: v.union(
        v.object({
          xp: v.number(),
          level: v.number(),
          rarity: v.union(
            v.literal("common"),
            v.literal("rare"),
            v.literal("epic")
          ),
          seasonStats: v.object({
            matches: v.number(),
            minutes: v.number(),
            goals: v.number(),
            assists: v.number(),
            cleanSheets: v.number(),
          }),
          badges: v.optional(v.array(v.string())),
        }),
        v.null()
      ),
      showFullIdentity: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .first();
    if (!team || !team.isSelectionTeam) return [];

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const out = [];
    for (const player of players.filter((p) => p.active)) {
      const consents = await ctx.db
        .query("playerConsents")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();
      out.push(
        redactPlayerForPublic(
          {
            _id: String(player._id),
            name: player.name,
            number: player.number,
            positionPrimary: player.positionPrimary,
            positionSecondary: player.positionSecondary,
            photoUrl: player.photoUrl,
            cardProfile: player.cardProfile,
          },
          consents as ConsentRow[]
        )
      );
    }

    return out.sort((a, b) => {
      const la = a.cardProfile?.level ?? 0;
      const lb = b.cardProfile?.level ?? 0;
      return lb - la;
    });
  },
});
