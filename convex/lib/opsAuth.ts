import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAdminAccess } from "../adminAuth";

const OPS_SECRET = process.env.CONVEX_OPS_SECRET?.trim() ?? "";

export function hasValidOpsSecret(provided?: string) {
  return Boolean(OPS_SECRET && provided && provided.trim() === OPS_SECRET);
}

export async function requireAdminOrOps(
  ctx: MutationCtx | QueryCtx,
  providedSecret?: string,
) {
  if (hasValidOpsSecret(providedSecret)) {
    return;
  }

  await requireAdminAccess(ctx);
}
