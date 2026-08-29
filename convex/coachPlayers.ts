/**
 * Coach roster edits — shirt number and positions for own-team players.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { isValidPosition } from "../src/lib/positions";
import {
  getCurrentUserAccess,
  requireCoachForTeam,
} from "./lib/userAccess";
import { hasAdminRole } from "./lib/adminOverride";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

async function assertCanEditTeamRoster(
  ctx: MutationCtx,
  teamId: Id<"teams">,
): Promise<void> {
  const access = await getCurrentUserAccess(ctx);
  if (hasAdminRole(access)) {
    return;
  }
  await requireCoachForTeam(ctx, teamId);
}

function assertOptionalPosition(label: string, code: string | undefined): void {
  if (!code) return;
  if (!isValidPosition(code)) {
    throw new Error(`Ongeldige ${label}: ${code}`);
  }
}

/** Drop an optional field from a player document for `replace`. */
function withoutKeys(
  player: Doc<"players">,
  keys: Array<"number" | "positionPrimary" | "positionSecondary">,
): Omit<Doc<"players">, "_id" | "_creationTime"> & {
  _id?: undefined;
  _creationTime?: undefined;
} {
  const {
    _id: _dropId,
    _creationTime: _dropCreation,
    ...rest
  } = player;
  const copy = { ...rest } as Record<string, unknown>;
  for (const key of keys) {
    delete copy[key];
  }
  return copy as Omit<Doc<"players">, "_id" | "_creationTime">;
}

/**
 * Update rugnummer and/or positions for a player on a team the coach owns.
 * Empty string for a position clears that field. `clearNumber: true` removes the number.
 * Does not change name, active, or team (admin-only).
 */
export const updatePlayerRosterFields = mutation({
  args: {
    playerId: v.id("players"),
    number: v.optional(v.number()),
    clearNumber: v.optional(v.boolean()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Speler niet gevonden");
    }

    await assertCanEditTeamRoster(ctx, player.teamId);

    if (args.number !== undefined) {
      if (!Number.isInteger(args.number) || args.number < 1 || args.number > 99) {
        throw new Error("Rugnummer moet tussen 1 en 99 liggen");
      }
    }

    if (args.positionPrimary) {
      assertOptionalPosition("positie", args.positionPrimary);
    }
    if (args.positionSecondary) {
      assertOptionalPosition("2e positie", args.positionSecondary);
    }

    const clearPrimary = args.positionPrimary === "";
    const clearSecondary = args.positionSecondary === "";
    const needsReplace =
      args.clearNumber === true || clearPrimary || clearSecondary;

    if (needsReplace) {
      const drop: Array<"number" | "positionPrimary" | "positionSecondary"> = [];
      if (args.clearNumber) drop.push("number");
      if (clearPrimary) drop.push("positionPrimary");
      if (clearSecondary) drop.push("positionSecondary");

      const base = withoutKeys(player, drop);
      await ctx.db.replace(args.playerId, {
        ...base,
        ...(args.number !== undefined && !args.clearNumber
          ? { number: args.number }
          : {}),
        ...(args.positionPrimary && !clearPrimary
          ? { positionPrimary: args.positionPrimary }
          : {}),
        ...(args.positionSecondary && !clearSecondary
          ? { positionSecondary: args.positionSecondary }
          : {}),
      });
      return null;
    }

    const patch: {
      number?: number;
      positionPrimary?: string;
      positionSecondary?: string;
    } = {};
    if (args.number !== undefined) patch.number = args.number;
    if (args.positionPrimary) patch.positionPrimary = args.positionPrimary;
    if (args.positionSecondary) patch.positionSecondary = args.positionSecondary;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.playerId, patch);
    }

    return null;
  },
});
