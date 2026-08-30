import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";

export type ClubRole = "club_admin" | "planner" | "coach" | "referee";
type ReaderCtx = QueryCtx | MutationCtx;

export const ALL_CLUB_ROLES: readonly ClubRole[] = [
  "club_admin",
  "planner",
  "coach",
  "referee",
];

async function requireIdentity(ctx: ReaderCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED");
  }
  return identity;
}

export async function getAppUserForIdentity(
  ctx: ReaderCtx,
  identity: UserIdentity
) {
  return await ctx.db
    .query("appUsers")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

export async function requireAppUser(ctx: ReaderCtx) {
  const identity = await requireIdentity(ctx);
  const user = await getAppUserForIdentity(ctx, identity);
  if (!user) {
    throw new Error("ACCOUNT_NOT_SYNCHRONIZED");
  }
  return { identity, user };
}

export async function getClubMembership(
  ctx: ReaderCtx,
  clubId: Id<"clubs">,
  userId: Id<"appUsers">
) {
  return await ctx.db
    .query("clubMemberships")
    .withIndex("by_club_and_user", (q) =>
      q.eq("clubId", clubId).eq("userId", userId)
    )
    .unique();
}

export function membershipHasAnyRole(
  membership: Pick<Doc<"clubMemberships">, "roles" | "status"> | null,
  allowedRoles: readonly ClubRole[]
) {
  return Boolean(
    membership?.status === "active" &&
      membership.roles.some((role) => allowedRoles.includes(role))
  );
}

export async function requireClubRole(
  ctx: ReaderCtx,
  userId: Id<"appUsers">,
  clubId: Id<"clubs">,
  allowedRoles: readonly ClubRole[]
) {
  const membership = await getClubMembership(ctx, clubId, userId);
  if (!membershipHasAnyRole(membership, allowedRoles)) {
    throw new Error("FORBIDDEN");
  }
  return membership as Doc<"clubMemberships">;
}

export const identityMutation = customMutation(
  mutation,
  customCtx(async (ctx: MutationCtx) => ({
    identity: await requireIdentity(ctx),
  }))
);

export const identityQuery = customQuery(
  query,
  customCtx(async (ctx: QueryCtx) => ({
    identity: await requireIdentity(ctx),
  }))
);

export const authenticatedQuery = customQuery(
  query,
  customCtx(async (ctx: QueryCtx) => await requireAppUser(ctx))
);

export const authenticatedMutation = customMutation(
  mutation,
  customCtx(async (ctx: MutationCtx) => await requireAppUser(ctx))
);

export const testHelpers = {
  membershipHasAnyRole,
};
