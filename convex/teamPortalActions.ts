import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  checkedText,
  demand,
  portalAccess,
  teamPlayer,
} from "./lib/teamPortalAccess";
import { feedbackContent, memberRole, taskStatus } from "./teamPortalSchema";

export const setMembership = mutation({
  args: {
    slug: v.string(),
    account: v.string(),
    role: memberRole,
    label: v.string(),
    playerIds: v.array(v.id("players")),
    active: v.boolean(),
    guardianApproved: v.boolean(),
  },
  returns: v.id("portalMemberships"),
  handler: async (ctx, args) => {
    const a = await portalAccess(ctx, args.slug);
    demand(a.identity && (a.isStaff || a.isAdmin));
    demand(
      args.role !== "team_manager" || a.isAdmin,
      "Alleen clubbeheer benoemt of verwijdert teamstaf.",
    );
    const account = args.account.trim();
    demand(
      account.length <= 254 &&
        (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) ||
          /^user_[A-Za-z0-9]+$/.test(account)),
      "Vul een e-mailadres of Clerk-account-ID in.",
    );
    const accountKey =
      account.startsWith("user_") && !account.includes("@")
        ? `user:${account}`
        : `email:${account.toLowerCase()}`;
    const ids = [...new Set(args.playerIds)];
    demand(
      !args.active ||
        (ids.length <= 10 &&
          (args.role === "team_manager" ? ids.length === 0 : ids.length > 0)),
      "Koppel de juiste spelers aan dit account.",
    );
    demand(
      !args.active || args.role !== "player" || ids.length === 1,
      "Een spelertoegang hoort bij één speler.",
    );
    demand(
      args.role === "team_manager" || !args.active || args.guardianApproved,
      "Bevestig eerst de ouder-kindkoppeling of oudergoedkeuring voor spelertoegang.",
    );
    const current = await ctx.db
      .query("portalMemberships")
      .withIndex("by_team_account_role", (q) =>
        q
          .eq("teamId", a.team._id)
          .eq("accountKey", accountKey)
          .eq("role", args.role),
      )
      .unique();
    if (args.active) {
      for (const id of ids) await teamPlayer(ctx, a, id);
    } else {
      demand(current, "Deze koppeling bestaat niet.");
    }
    const values = {
      teamId: a.team._id,
      accountKey,
      role: args.role,
      playerIds: args.active ? ids : current!.playerIds,
      label: checkedText(args.label, 80, true),
      active: args.active,
      updatedAt: Date.now(),
      updatedBy: a.identity.subject,
    };
    if (current) {
      await ctx.db.patch(current._id, values);
      return current._id;
    }
    return await ctx.db.insert("portalMemberships", {
      ...values,
      createdAt: Date.now(),
    });
  },
});

export const setConsent = mutation({
  args: {
    slug: v.string(),
    playerId: v.id("players"),
    teamProfile: v.boolean(),
    publicProfile: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await portalAccess(ctx, args.slug);
    await teamPlayer(ctx, a, args.playerId);
    demand(
      a.identity &&
        a.memberships.some(
          (m) => m.role === "parent" && m.playerIds.includes(args.playerId),
        ),
    );
    const current = await ctx.db
      .query("portalConsents")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .unique();
    const values = {
      teamId: a.team._id,
      playerId: args.playerId,
      teamProfile: args.teamProfile,
      publicProfile: args.publicProfile,
      updatedBy: a.identity.subject,
      updatedAt: Date.now(),
    };
    if (current) await ctx.db.patch(current._id, values);
    else await ctx.db.insert("portalConsents", values);
    return null;
  },
});

export const saveFeedback = mutation({
  args: {
    slug: v.string(),
    playerId: v.id("players"),
    content: feedbackContent,
    revision: v.number(),
    action: v.union(
      v.literal("save"),
      v.literal("publish"),
      v.literal("withdraw"),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const a = await portalAccess(ctx, args.slug);
    demand(
      a.isCoach && a.identity,
      "Alleen een toegewezen coach kan feedback schrijven.",
    );
    await teamPlayer(ctx, a, args.playerId);
    const current = await ctx.db
      .query("portalFeedback")
      .withIndex("by_team_player_author", (q) =>
        q.eq("teamId", a.team._id).eq("playerId", args.playerId).eq("author", a.identity!.subject),
      )
      .unique();
    demand(
      Number.isSafeInteger(args.revision) &&
        (current?.revision ?? 0) === args.revision,
      "De feedback is elders gewijzigd. Open de speler opnieuw.",
    );
    const draft = {
      compliment: checkedText(args.content.compliment, 2000),
      nextStep: checkedText(args.content.nextStep, 2000),
      report: checkedText(args.content.report, 12000),
    };
    demand(
      args.action !== "publish" || (draft.compliment && draft.nextStep),
      "Vul een compliment en volgende stap in voor publicatie.",
    );
    const revision = args.revision + 1;
    const values = {
      teamId: a.team._id,
      playerId: args.playerId,
      author: a.identity.subject,
      draft,
      revision,
      updatedAt: Date.now(),
      ...(args.action === "publish"
        ? { published: draft, publishedAt: Date.now() }
        : args.action === "withdraw"
          ? { published: undefined, publishedAt: undefined }
          : {}),
    };
    if (current) await ctx.db.patch(current._id, values);
    else await ctx.db.insert("portalFeedback", values);
    return revision;
  },
});

export const assignTask = mutation({
  args: {
    slug: v.string(),
    taskId: v.optional(v.id("portalTasks")),
    matchId: v.id("matches"),
    title: v.string(),
    assigneeId: v.id("portalMemberships"),
    revision: v.number(),
  },
  returns: v.id("portalTasks"),
  handler: async (ctx, args) => {
    const a = await portalAccess(ctx, args.slug);
    demand(a.identity && (a.isStaff || a.isAdmin));
    const match = await ctx.db.get(args.matchId);
    const parent = await ctx.db.get(args.assigneeId);
    demand(
      match?.teamId === a.team._id &&
        parent?.teamId === a.team._id &&
        parent.active &&
        parent.role === "parent",
      "Kies een wedstrijd en ouder van dit team.",
    );
    const current = args.taskId ? await ctx.db.get(args.taskId) : null;
    demand(!args.taskId || current?.teamId === a.team._id);
    demand(
      Number.isSafeInteger(args.revision) &&
        (current?.revision ?? 0) === args.revision,
      "Deze taak is gewijzigd. Ververs het overzicht.",
    );
    const values = {
      teamId: a.team._id,
      matchId: args.matchId,
      title: checkedText(args.title, 100, true),
      assigneeId: args.assigneeId,
      status: "pending" as const,
      response: "",
      revision: args.revision + 1,
      updatedAt: Date.now(),
      updatedBy: a.identity.subject,
    };
    if (current) {
      await ctx.db.patch(current._id, values);
      return current._id;
    }
    return await ctx.db.insert("portalTasks", values);
  },
});

export const respondToTask = mutation({
  args: {
    slug: v.string(),
    taskId: v.id("portalTasks"),
    revision: v.number(),
    status: taskStatus,
    response: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const a = await portalAccess(ctx, args.slug);
    const task = await ctx.db.get(args.taskId);
    demand(
      a.identity &&
        task?.teamId === a.team._id &&
        a.memberships.some(
          (m) => m._id === task.assigneeId && m.role === "parent",
        ),
    );
    demand(
      task.revision === args.revision && Number.isSafeInteger(args.revision),
      "Deze taak is opnieuw ingedeeld. Bekijk de nieuwe taak.",
    );
    demand(
      args.status === "confirmed" ||
        args.status === "change_requested" ||
        (args.status === "done" && task.status === "confirmed"),
      "Bevestig de taak voordat je deze afrondt.",
    );
    const response = checkedText(
      args.response,
      500,
      args.status === "change_requested",
    );
    await ctx.db.patch(task._id, {
      status: args.status,
      response,
      revision: task.revision + 1,
      updatedAt: Date.now(),
      updatedBy: a.identity.subject,
    });
    return null;
  },
});
