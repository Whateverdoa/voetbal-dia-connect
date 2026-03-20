/**
 * Admin authentication helper.
 * Admin access is derived from the signed-in Clerk identity and `userAccess`.
 */
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/userAccess";

export async function requireAdminAccess(ctx: MutationCtx | QueryCtx) {
  await requireRole(ctx, "admin");
}

export const verifyAdminAccessQuery = query({
  handler: async (ctx) => {
    try {
      await requireRole(ctx, "admin");
      return { valid: true };
    } catch {
      return { valid: false };
    }
  },
});
