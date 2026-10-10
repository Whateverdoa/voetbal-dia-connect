import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoachForMatch } from "./lib/userAccess";
import { clampPercent } from "../src/lib/tactics/seedTokens";

const tokenArg = v.object({
  playerId: v.id("players"),
  x: v.number(),
  y: v.number(),
  onBoard: v.boolean(),
});

const tokenView = v.object({
  playerId: v.id("players"),
  x: v.number(),
  y: v.number(),
  onBoard: v.boolean(),
  name: v.string(),
  number: v.union(v.number(), v.null()),
  photoUrl: v.union(v.string(), v.null()),
});

export const getBoard = query({
  args: { matchId: v.id("matches") },
  returns: v.union(
    v.null(),
    v.object({
      boardId: v.id("tacticBoards"),
      matchId: v.id("matches"),
      tokens: v.array(tokenView),
    })
  ),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    await requireCoachForMatch(ctx, match);

    const board = await ctx.db
      .query("tacticBoards")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!board) return null;

    const tokens = [];
    for (const token of board.tokens) {
      const player = await ctx.db.get(token.playerId);
      if (!player) continue;
      tokens.push({
        playerId: token.playerId,
        x: token.x,
        y: token.y,
        onBoard: token.onBoard,
        name: player.name,
        number: player.number ?? null,
        photoUrl: player.photoUrl ?? null,
      });
    }

    return { boardId: board._id, matchId: board.matchId, tokens };
  },
});

export const ensureBoard = mutation({
  args: {
    matchId: v.id("matches"),
    tokens: v.array(tokenArg),
  },
  returns: v.id("tacticBoards"),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    await requireCoachForMatch(ctx, match);

    const existing = await ctx.db
      .query("tacticBoards")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("tacticBoards", {
      matchId: args.matchId,
      tokens: args.tokens.map((token) => ({
        ...token,
        x: clampPercent(token.x),
        y: token.onBoard ? clampPercent(token.y) : 0,
      })),
      updatedAt: Date.now(),
    });
  },
});

export const moveToken = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    x: v.number(),
    y: v.number(),
    onBoard: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    await requireCoachForMatch(ctx, match);

    const board = await ctx.db
      .query("tacticBoards")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!board) throw new Error("Tactiekbord niet gevonden");

    const tokens = board.tokens.map((token) =>
      token.playerId === args.playerId
        ? {
            ...token,
            x: clampPercent(args.x),
            y: args.onBoard ? clampPercent(args.y) : 0,
            onBoard: args.onBoard,
          }
        : token
    );

    await ctx.db.patch(board._id, { tokens, updatedAt: Date.now() });
    return null;
  },
});

export const resetBoard = mutation({
  args: {
    matchId: v.id("matches"),
    tokens: v.array(tokenArg),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    await requireCoachForMatch(ctx, match);

    const board = await ctx.db
      .query("tacticBoards")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .unique();
    const next = {
      matchId: args.matchId,
      tokens: args.tokens.map((token) => ({
        ...token,
        x: clampPercent(token.x),
        y: token.onBoard ? clampPercent(token.y) : 0,
      })),
      updatedAt: Date.now(),
    };
    if (board) {
      await ctx.db.patch(board._id, next);
    } else {
      await ctx.db.insert("tacticBoards", next);
    }
    return null;
  },
});
