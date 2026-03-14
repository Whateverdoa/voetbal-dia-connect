/**
 * Admin authentication helper
 * Centralized email-based admin verification for all admin operations.
 *
 * Admin access is derived from the signed-in identity email and the
 * CLERK_BOOTSTRAP_ADMIN_EMAILS allowlist.
 */
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AdminCtx = MutationCtx | QueryCtx;

function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.CLERK_BOOTSTRAP_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function hasAdminAccess(ctx: AdminCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase();
  if (!email) return false;
  return getAdminEmailAllowlist().has(email);
}

export async function requireAdminAccess(ctx: AdminCtx): Promise<void> {
  const allowed = await hasAdminAccess(ctx);
  if (!allowed) {
    throw new Error("Geen admin-toegang");
  }
}

/**
 * Convex query for client-side verification of admin access.
 */
export const verifyAdminAccessQuery = query({
  handler: async (ctx) => {
    try {
      await requireAdminAccess(ctx);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  },
});
