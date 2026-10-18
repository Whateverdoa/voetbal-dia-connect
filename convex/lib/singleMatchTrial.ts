import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { pilotIdentity, pilotMatchAccess } from "./mobilePilotAccess";

// Temporary server-side fence. Removing it requires a separately reviewed rollout.
export const TRIAL_MATCH_ID = "jn7cw69dexmjjmg88jbwsxj4kx8gecgr" as Id<"matches">;
export const TRIAL_EMAIL = "mjtenhoonte@gmail.com";
export const PENDING_TRIAL_SUBJECT = `pending-trial:${TRIAL_EMAIL}`;

export async function trialIdentity(ctx: QueryCtx | MutationCtx, matchId = TRIAL_MATCH_ID) {
  const actor = await pilotIdentity(ctx);
  const identity = await ctx.auth.getUserIdentity();
  if (matchId !== TRIAL_MATCH_ID || identity?.email?.trim().toLowerCase() !== TRIAL_EMAIL ||
      actor.access.email !== TRIAL_EMAIL) throw new ConvexError("PILOT_ACCESS_DENIED");
  return actor;
}

export async function trialAccess(ctx: QueryCtx | MutationCtx, matchId = TRIAL_MATCH_ID) {
  await trialIdentity(ctx, matchId);
  return await pilotMatchAccess(ctx, TRIAL_MATCH_ID);
}
