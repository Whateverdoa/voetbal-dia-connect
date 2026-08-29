/**
 * Admin player photo upload via Convex storage.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setPlayerPhoto = mutation({
  args: {
    playerId: v.id("players"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Speler niet gevonden");

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Foto niet gevonden in opslag");

    if (player.photoStorageId) {
      try {
        await ctx.storage.delete(player.photoStorageId);
      } catch {
        // ignore missing old file
      }
    }

    await ctx.db.patch(args.playerId, {
      photoStorageId: args.storageId,
      photoUrl: url,
    });
    return null;
  },
});

export const clearPlayerPhoto = mutation({
  args: { playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Speler niet gevonden");

    if (player.photoStorageId) {
      try {
        await ctx.storage.delete(player.photoStorageId);
      } catch {
        // ignore
      }
    }

    await ctx.db.patch(args.playerId, {
      photoStorageId: undefined,
      photoUrl: undefined,
    });
    return null;
  },
});

export const getPlayerPhotoUrl = query({
  args: { playerId: v.id("players") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;
    return player.photoUrl ?? null;
  },
});
