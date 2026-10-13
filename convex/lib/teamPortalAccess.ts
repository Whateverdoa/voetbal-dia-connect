import { ConvexError } from "convex/values";
import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getCurrentUserAccess } from "./userAccess";

type Ctx = QueryCtx | MutationCtx;
export function demand(
  value: unknown,
  message = "Geen toegang tot dit onderdeel.",
): asserts value {
  if (!value) throw new ConvexError(message);
}

export async function portalAccess(ctx: Ctx, slug: string) {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug_only", (q) => q.eq("slug", slug))
    .first();
  demand(team && team.active !== false, "Dit team is niet beschikbaar.");
  const identity = await ctx.auth.getUserIdentity();
  const verified =
    identity?.emailVerified === true || identity?.email_verified === true;
  const email =
    verified && typeof identity?.email === "string"
      ? identity.email.trim().toLowerCase()
      : null;
  const keys = identity
    ? [`user:${identity.subject}`, ...(email ? [`email:${email}`] : [])]
    : [];
  const memberships = (
    await Promise.all(
      keys.map((accountKey) =>
        ctx.db
          .query("portalMemberships")
          .withIndex("by_team_account_role", (q) =>
            q.eq("teamId", team._id).eq("accountKey", accountKey),
          )
          .take(10),
      ),
    )
  )
    .flat()
    .filter((m) => m.active);
  const legacy = email ? await getCurrentUserAccess(ctx) : null;
  const coach =
    legacy?.roles.includes("coach") && legacy.coachId
      ? await ctx.db.get(legacy.coachId)
      : null;
  const isCoach = Boolean(coach?.teamIds.includes(team._id));
  const isAdmin = Boolean(legacy?.roles.includes("admin"));
  const isManager = memberships.some((m) => m.role === "team_manager");
  const linked = memberships
    .filter((m) => m.role === "parent" || m.role === "player")
    .flatMap((m) => m.playerIds);
  const linkedPlayers = await Promise.all(
    [...new Set(linked)].map((id) => ctx.db.get(id)),
  );
  const ownPlayerIds = linkedPlayers
    .filter((p) => p?.teamId === team._id && p.active)
    .map((p) => p!._id);
  return {
    team,
    identity,
    memberships,
    ownPlayerIds,
    isCoach,
    isAdmin,
    isManager,
    isStaff: isCoach || isManager,
    isMember: isCoach || isManager || ownPlayerIds.length > 0,
  };
}
export type PortalAccess = Awaited<ReturnType<typeof portalAccess>>;

export async function teamPlayer(
  ctx: Ctx,
  access: PortalAccess,
  playerId: Id<"players">,
) {
  const player = await ctx.db.get(playerId);
  demand(
    player?.active && player.teamId === access.team._id,
    "Deze speler is niet beschikbaar.",
  );
  return player;
}
export function canDevelop(access: PortalAccess, playerId: Id<"players">) {
  return access.isCoach || access.ownPlayerIds.includes(playerId);
}
export async function projectPlayer(
  ctx: Ctx,
  access: PortalAccess,
  player: Doc<"players">,
) {
  const consent = await ctx.db
    .query("portalConsents")
    .withIndex("by_player", (q) => q.eq("playerId", player._id))
    .unique();
  const own = access.ownPlayerIds.includes(player._id);
  const known =
    access.isStaff ||
    access.isAdmin ||
    own ||
    (access.isMember && consent?.teamProfile) ||
    consent?.publicProfile;
  const canOpen =
    access.isMember &&
    (own || access.isStaff || consent?.teamProfile || consent?.publicProfile);
  return {
    id: known ? player._id : null,
    name: known ? player.name.trim().split(/\s+/)[0] : "Teamgenoot",
    position:
      known && access.isMember ? (player.positionPrimary ?? null) : null,
    number: known && access.isMember ? (player.number ?? null) : null,
    canOpen: Boolean(canOpen),
    canDevelop: canDevelop(access, player._id),
  };
}

export function checkedText(value: string, max: number, required = false) {
  const text = value.trim();
  demand(
    text.length <= max && (!required || text.length > 0),
    "Controleer de tekstlengte en verplichte velden.",
  );
  return text;
}
