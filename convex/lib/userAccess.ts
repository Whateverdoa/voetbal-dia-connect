import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeEmail, parseEmailList } from "../../src/lib/auth/adminAccess";

export type AccessRole = "admin" | "coach" | "referee";
export type AccessSource =
  | "bootstrap_admin"
  | "migration_backfill"
  | "admin_manual"
  | "coach_sync"
  | "referee_sync"
  | "recovery";

type ReaderCtx = QueryCtx | MutationCtx;
export type RuntimeUserAccess = Pick<
  Doc<"userAccess">,
  "email" | "roles" | "coachId" | "refereeId" | "active"
>;

export async function getAuthenticatedEmail(ctx: ReaderCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return normalizeEmail(identity?.email);
}

export async function getUserAccessByEmail(ctx: ReaderCtx, email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return await ctx.db
    .query("userAccess")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();
}

function mergeRuntimeUserAccess(
  existing: RuntimeUserAccess | null,
  derived: RuntimeUserAccess | null
) {
  if (existing) {
    if (!existing.active) {
      return null;
    }

    if (!derived) {
      return existing;
    }

    return {
      ...existing,
      roles: Array.from(new Set([...existing.roles, ...derived.roles])).sort() as AccessRole[],
      coachId: existing.coachId ?? derived.coachId,
      refereeId: existing.refereeId ?? derived.refereeId,
    } satisfies RuntimeUserAccess;
  }

  if (!derived || !derived.active) {
    return null;
  }

  return derived;
}

async function deriveRuntimeUserAccess(ctx: ReaderCtx, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const roles = new Set<AccessRole>();

  if (getBootstrapAdminEmails().includes(normalizedEmail)) {
    roles.add("admin");
  }

  const coach = await ctx.db
    .query("coaches")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();

  if (coach) {
    roles.add("coach");
  }

  const referee = await ctx.db
    .query("referees")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();

  if (referee?.active) {
    roles.add("referee");
  }

  if (roles.size === 0) {
    return null;
  }

  return {
    email: normalizedEmail,
    roles: Array.from(roles).sort() as AccessRole[],
    coachId: coach?._id,
    refereeId: referee?.active ? referee._id : undefined,
    active: true,
  } satisfies RuntimeUserAccess;
}

async function resolveRuntimeUserAccess(ctx: ReaderCtx, email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const existing = await getUserAccessByEmail(ctx, normalizedEmail);
  const derived = await deriveRuntimeUserAccess(ctx, normalizedEmail);
  return mergeRuntimeUserAccess(existing, derived);
}

export async function getCurrentUserAccess(ctx: ReaderCtx) {
  const email = await getAuthenticatedEmail(ctx);
  if (!email) return null;

  return await resolveRuntimeUserAccess(ctx, email);
}

export async function requireUserAccess(ctx: ReaderCtx) {
  const email = await getAuthenticatedEmail(ctx);
  if (!email) {
    throw new Error("Niet ingelogd");
  }

  const access = await resolveRuntimeUserAccess(ctx, email);
  if (!access) {
    throw new Error("Geen toegang");
  }

  return access;
}

export async function requireRole(ctx: ReaderCtx, role: AccessRole) {
  const access = await requireUserAccess(ctx);
  if (!access.roles.includes(role)) {
    throw new Error(`Geen ${role}-toegang`);
  }
  return access;
}

export async function requireCoachAccess(ctx: ReaderCtx) {
  const access = await requireRole(ctx, "coach");
  if (!access.coachId) {
    throw new Error("Coachtoegang is niet gekoppeld aan een coachrecord");
  }

  const coach = await ctx.db.get(access.coachId);
  if (!coach) {
    throw new Error("Coachrecord niet gevonden");
  }

  return { access, coach };
}

export async function requireCoachForTeam(
  ctx: ReaderCtx,
  teamId: Id<"teams">
) {
  const { access, coach } = await requireCoachAccess(ctx);
  if (!coach.teamIds.includes(teamId)) {
    throw new Error("Geen toegang tot dit team");
  }

  return { access, coach };
}

export async function requireRefereeAccess(ctx: ReaderCtx) {
  const access = await requireRole(ctx, "referee");
  if (!access.refereeId) {
    throw new Error("Scheidsrechtertoegang is niet gekoppeld aan een scheidsrechterrecord");
  }

  const referee = await ctx.db.get(access.refereeId);
  if (!referee || !referee.active) {
    throw new Error("Scheidsrechterrecord niet gevonden of inactief");
  }

  return { access, referee };
}

export async function requireCoachForMatch(
  ctx: ReaderCtx,
  match: Doc<"matches">
) {
  const { coach } = await requireCoachForTeam(ctx, match.teamId);
  return coach;
}

export async function requireRefereeForMatch(
  ctx: ReaderCtx,
  match: Doc<"matches">
) {
  const { referee } = await requireRefereeAccess(ctx);
  if (!match.refereeId || match.refereeId !== referee._id) {
    throw new Error("Geen toegang tot deze wedstrijd");
  }
  return referee;
}

export async function upsertUserAccess(
  ctx: MutationCtx,
  args: {
    email: string;
    roles: AccessRole[];
    coachId?: Id<"coaches">;
    refereeId?: Id<"referees">;
    active?: boolean;
    source: AccessSource;
  }
) {
  const email = normalizeEmail(args.email);
  if (!email) {
    throw new Error("E-mailadres is verplicht");
  }

  const roles = Array.from(new Set(args.roles)).sort() as AccessRole[];
  const now = Date.now();
  const existing = await getUserAccessByEmail(ctx, email);

  if (existing) {
    await ctx.db.patch(existing._id, {
      roles,
      coachId: args.coachId,
      refereeId: args.refereeId,
      active: args.active ?? true,
      source: args.source,
      lastSyncedAt: now,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("userAccess", {
    email,
    roles,
    ...(args.coachId ? { coachId: args.coachId } : {}),
    ...(args.refereeId ? { refereeId: args.refereeId } : {}),
    active: args.active ?? true,
    source: args.source,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deactivateUserAccess(ctx: MutationCtx, email?: string | null) {
  const existing = await getUserAccessByEmail(ctx, email);
  if (!existing) return null;

  const now = Date.now();
  await ctx.db.patch(existing._id, {
    active: false,
    updatedAt: now,
    lastSyncedAt: now,
  });
  return existing._id;
}

export async function removeRoleFromUserAccess(
  ctx: MutationCtx,
  args: {
    email?: string | null;
    role: AccessRole;
  }
) {
  const existing = await getUserAccessByEmail(ctx, args.email);
  if (!existing) return null;

  const roles = existing.roles.filter((role) => role !== args.role) as AccessRole[];
  const now = Date.now();

  if (roles.length === 0) {
    await ctx.db.patch(existing._id, {
      active: false,
      roles: [],
      coachId: undefined,
      refereeId: undefined,
      updatedAt: now,
      lastSyncedAt: now,
    });
    return existing._id;
  }

  await ctx.db.patch(existing._id, {
    roles,
    coachId: args.role === "coach" ? undefined : existing.coachId,
    refereeId: args.role === "referee" ? undefined : existing.refereeId,
    updatedAt: now,
    lastSyncedAt: now,
  });
  return existing._id;
}

export function getBootstrapAdminEmails() {
  return parseEmailList(process.env.CLERK_BOOTSTRAP_ADMIN_EMAILS ?? "");
}

export const testHelpers = {
  mergeRuntimeUserAccess,
};
