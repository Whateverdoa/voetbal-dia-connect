import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { voterKindValidator } from "./cardSchema";
import { normalizeEmail } from "../src/lib/auth/adminAccess";
import { requireCardStaff, requireVoterIdentity, selectionTeam } from "./lib/cardData";

const INVITE_LIFETIME = 7 * 24 * 60 * 60 * 1000;

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function revokeSeatInvitations(ctx: MutationCtx, membershipId: Id<"cardVoterMemberships">) {
  const groups = await Promise.all((["pending", "accepted"] as const).map((status) =>
    ctx.db.query("cardVoterInvitations").withIndex("by_membership_status", (q) => q.eq("membershipId", membershipId).eq("status", status)).take(64)
  ));
  for (const invitation of groups.flat()) await ctx.db.patch(invitation._id, { status: "revoked", updatedAt: Date.now() });
}

export const inviteVoter = mutation({
  args: { teamId: v.id("teams"), playerId: v.id("players"), kind: voterKindValidator, email: v.string() },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const actor = await requireCardStaff(ctx, args.teamId);
    await selectionTeam(ctx, args.teamId);
    const player = await ctx.db.get(args.playerId);
    if (!player?.active || player.teamId !== args.teamId) throw new Error("Kies een actieve speler van dit team");
    const email = normalizeEmail(args.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Vul een geldig e-mailadres in");
    const opposite = await ctx.db.query("cardVoterMemberships").withIndex("by_team_player_kind", (q) => q.eq("teamId", args.teamId).eq("playerId", args.playerId).eq("kind", args.kind === "player" ? "parent" : "player")).unique();
    if (opposite?.active && opposite.email === email) throw new Error("Speler en ouder gebruiken verschillende accounts");
    const existing = await ctx.db.query("cardVoterMemberships").withIndex("by_team_player_kind", (q) => q.eq("teamId", args.teamId).eq("playerId", args.playerId).eq("kind", args.kind)).unique();
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Date.now();
    const fields = {
      email, active: true, identity: undefined, claimedAt: undefined,
      bindingVersion: (existing?.bindingVersion ?? 0) + 1,
      inviteHash: await tokenHash(token), inviteExpiresAt: now + INVITE_LIFETIME, updatedAt: now,
    };
    let membershipId: Id<"cardVoterMemberships">;
    if (existing) {
      membershipId = existing._id;
      await revokeSeatInvitations(ctx, membershipId);
      await ctx.db.patch(membershipId, fields);
    } else membershipId = await ctx.db.insert("cardVoterMemberships", { ...args, ...fields, createdAt: now });
    await ctx.db.insert("cardVoterInvitations", {
      membershipId, email, tokenHash: fields.inviteHash, bindingVersion: fields.bindingVersion,
      expiresAt: fields.inviteExpiresAt, status: "pending", createdBy: actor,
      createdAt: now, updatedAt: now,
    });
    return { token };
  },
});

export const revokeVoter = mutation({
  args: { membershipId: v.id("cardVoterMemberships") }, returns: v.null(),
  handler: async (ctx, args) => {
    const seat = await ctx.db.get(args.membershipId);
    if (!seat) throw new Error("Stemrecht niet gevonden");
    await requireCardStaff(ctx, seat.teamId);
    await revokeSeatInvitations(ctx, seat._id);
    await ctx.db.patch(seat._id, { active: false, bindingVersion: (seat.bindingVersion ?? 0) + 1, inviteHash: undefined, inviteExpiresAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() }, returns: v.object({ teamSlug: v.string() }),
  handler: async (ctx, args) => {
    const identity = await requireVoterIdentity(ctx);
    // Hash the bearer token before its indexed lookup; never return stored secrets.
    const digest = await tokenHash(args.token);
    const invitation = await ctx.db.query("cardVoterInvitations").withIndex("by_tokenHash", (q) => q.eq("tokenHash", digest)).unique();
    if (!invitation || invitation.status === "revoked" || invitation.expiresAt <= Date.now()) throw new Error("Deze uitnodiging is verlopen of ingetrokken");
    const membership = await ctx.db.get(invitation.membershipId);
    if (!membership?.active || membership.bindingVersion !== invitation.bindingVersion || membership.email !== invitation.email) throw new Error("Deze uitnodiging is verlopen of ingetrokken");
    if (normalizeEmail(identity.email) !== invitation.email || identity.emailVerified === false) throw new Error("Log in met het e-mailadres van de uitnodiging");
    if (invitation.status === "accepted" && invitation.acceptedIdentity !== identity.tokenIdentifier) throw new Error("Deze uitnodiging is al gebruikt");
    if (membership.identity && membership.identity !== identity.tokenIdentifier) throw new Error("Deze uitnodiging is al gebruikt");
    const team = await selectionTeam(ctx, membership.teamId);
    const player = await ctx.db.get(membership.playerId);
    if (!player?.active || player.teamId !== team._id) throw new Error("Deze speler staat niet meer in de selectie");
    const opposite = await ctx.db.query("cardVoterMemberships").withIndex("by_team_player_kind", (q) => q.eq("teamId", team._id).eq("playerId", player._id).eq("kind", membership.kind === "player" ? "parent" : "player")).unique();
    if (opposite?.active && opposite.identity === identity.tokenIdentifier) throw new Error("Speler en ouder gebruiken verschillende accounts");
    await ctx.db.patch(membership._id, { identity: identity.tokenIdentifier, claimedAt: membership.claimedAt ?? Date.now(), updatedAt: Date.now() });
    if (invitation.status === "pending") await ctx.db.patch(invitation._id, { status: "accepted", acceptedIdentity: identity.tokenIdentifier, acceptedAt: Date.now(), updatedAt: Date.now() });
    return { teamSlug: team.slug };
  },
});
