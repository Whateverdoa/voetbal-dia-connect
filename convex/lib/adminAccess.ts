import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAdminAccess } from "../adminAuth";
import { getAuthenticatedEmail as getEmailFromUserAccess } from "./userAccess";

type AuthCapableContext = MutationCtx | QueryCtx;

export async function getAuthenticatedEmail(ctx: AuthCapableContext) {
  return await getEmailFromUserAccess(ctx);
}

export async function requireAdmin(ctx: AuthCapableContext) {
  await requireAdminAccess(ctx);
  const email = await getAuthenticatedEmail(ctx);
  return { email };
}
