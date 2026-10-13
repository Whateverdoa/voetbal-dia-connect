import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  canDevelop,
  demand,
  portalAccess,
  projectPlayer,
  teamPlayer,
  inPortalRoster,
} from "./lib/teamPortalAccess";
import { feedbackContent, memberRole, taskStatus } from "./teamPortalSchema";
import { activeSeasonKey, isActiveSeasonMatch } from "./lib/season";

const playerView = v.object({
  id: v.union(v.id("players"), v.null()),
  name: v.string(),
  position: v.union(v.string(), v.null()),
  number: v.union(v.number(), v.null()),
  canOpen: v.boolean(),
  canDevelop: v.boolean(),
});
const matchView = v.object({
  id: v.id("matches"),
  opponent: v.string(),
  isHome: v.boolean(),
  scheduledAt: v.union(v.number(), v.null()),
  status: v.string(),
  homeScore: v.number(),
  awayScore: v.number(),
  publicCode: v.string(),
  venue: v.union(v.string(), v.null()),
});
const accessView = v.object({
  signedIn: v.boolean(),
  isCoach: v.boolean(),
  isManager: v.boolean(),
  isAdmin: v.boolean(),
  isMember: v.boolean(),
  isParent: v.boolean(),
  ownPlayerIds: v.array(v.id("players")),
});

export const overview = query({
  args: { slug: v.string() },
  returns: v.object({
    team: v.object({ id: v.id("teams"), name: v.string(), slug: v.string() }),
    access: accessView,
    players: v.array(playerView),
    matches: v.array(matchView),
  }),
  handler: async (ctx, { slug }) => {
    const a = await portalAccess(ctx, slug);
    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", a.team._id))
      .take(100);
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", a.team._id))
      .order("desc")
      .take(100);
    return {
      team: { id: a.team._id, name: a.team.name, slug: a.team.slug },
      access: {
        signedIn: Boolean(a.identity),
        isCoach: a.isCoach,
        isManager: a.isManager,
        isAdmin: a.isAdmin,
        isMember: a.isMember,
        isParent: a.memberships.some((m) => m.role === "parent"),
        ownPlayerIds: a.ownPlayerIds,
      },
      players: await Promise.all(
        players.filter((p) => inPortalRoster(slug, p)).map((p) => projectPlayer(ctx, a, p)),
      ),
      matches: matches
        .filter((m) => isActiveSeasonMatch(m, activeSeasonKey(Date.now())))
        .map((m) => ({
          id: m._id,
          opponent: m.opponent,
          isHome: m.isHome,
          scheduledAt: m.scheduledAt ?? null,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          publicCode: m.publicCode,
          venue: m.venueField ?? null,
        }))
        .sort((l, r) => (r.scheduledAt ?? 0) - (l.scheduledAt ?? 0)),
    };
  },
});

export const player = query({
  args: { slug: v.string(), playerId: v.id("players") },
  returns: v.object({
    profile: playerView,
    canDevelop: v.boolean(),
    canEdit: v.boolean(),
    canConsent: v.boolean(),
    consent: v.union(
      v.object({ teamProfile: v.boolean(), publicProfile: v.boolean() }),
      v.null(),
    ),
    published: v.array(
      v.object({
        id: v.id("portalFeedback"),
        content: feedbackContent,
        at: v.number(),
      }),
    ),
    draft: v.union(
      v.object({ content: feedbackContent, revision: v.number() }),
      v.null(),
    ),
  }),
  handler: async (ctx, { slug, playerId }) => {
    const a = await portalAccess(ctx, slug);
    const p = await teamPlayer(ctx, a, playerId);
    const profile = await projectPlayer(ctx, a, p);
    demand(profile.canOpen);
    const development = canDevelop(a, playerId);
    const canConsent = a.memberships.some(
      (m) => m.role === "parent" && m.playerIds.includes(playerId),
    );
    const consent = canConsent
      ? await ctx.db
          .query("portalConsents")
          .withIndex("by_player", (q) => q.eq("playerId", playerId))
          .unique()
      : null;
    const feedback = development
      ? await ctx.db
          .query("portalFeedback")
          .withIndex("by_team_player", (q) => q.eq("teamId", a.team._id).eq("playerId", playerId))
          .take(100)
      : [];
    const own = a.isCoach
      ? feedback.find((f) => f.author === a.identity?.subject)
      : null;
    return {
      profile,
      canDevelop: development,
      canEdit: a.isCoach,
      canConsent,
      consent: canConsent
        ? {
            teamProfile: consent?.teamId === a.team._id && consent.teamProfile,
            publicProfile: consent?.teamId === a.team._id && consent.publicProfile,
          }
        : null,
      published: feedback
        .filter((f) => f.published && f.publishedAt)
        .map((f) => ({ id: f._id, content: f.published!, at: f.publishedAt! })),
      draft: own ? { content: own.draft, revision: own.revision } : null,
    };
  },
});

export const organization = query({
  args: { slug: v.string() },
  returns: v.object({
    canManage: v.boolean(),
    canAppointStaff: v.boolean(),
    memberships: v.array(
      v.object({
        id: v.id("portalMemberships"),
        label: v.string(),
        accountKey: v.string(),
        role: memberRole,
        playerIds: v.array(v.id("players")),
        active: v.boolean(),
      }),
    ),
    tasks: v.array(
      v.object({
        id: v.id("portalTasks"),
        matchId: v.id("matches"),
        title: v.string(),
        assignee: v.string(),
        mine: v.boolean(),
        status: taskStatus,
        response: v.string(),
        revision: v.number(),
      }),
    ),
  }),
  handler: async (ctx, { slug }) => {
    const a = await portalAccess(ctx, slug);
    const isParent = a.memberships.some((m) => m.role === "parent");
    demand(a.isStaff || a.isAdmin || isParent);
    const members = await ctx.db
      .query("portalMemberships")
      .withIndex("by_team", (q) => q.eq("teamId", a.team._id))
      .take(300);
    const tasks = await ctx.db
      .query("portalTasks")
      .withIndex("by_team", (q) => q.eq("teamId", a.team._id))
      .order("desc")
      .take(200);
    return {
      canManage: a.isStaff || a.isAdmin,
      canAppointStaff: a.isAdmin,
      memberships:
        a.isStaff || a.isAdmin
          ? members.map((m) => ({
              id: m._id,
              label: m.label,
              accountKey: m.accountKey,
              role: m.role,
              playerIds: m.playerIds,
              active: m.active,
            }))
          : [],
      tasks: tasks.map((t) => ({
        id: t._id,
        matchId: t.matchId,
        title: t.title,
        assignee: members.find((m) => m._id === t.assigneeId)?.label ?? "Ouder",
        mine: a.memberships.some((m) => m._id === t.assigneeId),
        status: t.status,
        response:
          a.isStaff ||
          a.isAdmin ||
          a.memberships.some((m) => m._id === t.assigneeId)
            ? t.response
            : "",
        revision: t.revision,
      })),
    };
  },
});
