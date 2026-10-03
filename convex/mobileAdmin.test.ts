import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  executeAdminAssignStaff,
  executeAdminSaveEntity,
  executeAdminSaveMatch,
  readAdminCatalog,
  readAdminMatch,
} from "./mobileAdmin";
import { getCurrentUserAccess } from "./lib/userAccess";
import { verifyClockPin } from "./pinHelpers";

const now = 1_800_000_000_000;
const adminEmail = "admin@example.invalid";
const teamId = "team" as Id<"teams">;
const clubId = "club" as Id<"clubs">;
const matchId = "match" as Id<"matches">;
const coachId = "coach" as Id<"coaches">;
const refereeId = "referee" as Id<"referees">;
const replacementRefereeId = "replacement-referee" as Id<"referees">;
const playerIds = Array.from({ length: 15 }, (_, index) => `player-${index}` as Id<"players">);
type TestRow = Record<string, unknown> & { _id: string; _creationTime: number };
type EntityCommand = Parameters<typeof executeAdminSaveEntity>[1];
type MatchCommand = Parameters<typeof executeAdminSaveMatch>[1];
type StaffCommand = Parameters<typeof executeAdminAssignStaff>[1];

/** Actual auth and indexed storage, with rollback matching Convex mutations. */
function fixture(options: { status?: Doc<"matches">["status"] } = {}) {
  const tables = new Map<string, Map<string, TestRow>>();
  let nextId = 0;
  let email: string | null = adminEmail;
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  const seed = (name: string, value: Record<string, unknown> & { _id: string }) => {
    const row = { _creationTime: now, ...value };
    table(name).set(row._id, row);
    return row;
  };
  seed("clubs", { _id: clubId, name: "TEST DIA", slug: "test-dia", createdAt: now });
  seed("teams", { _id: teamId, clubId, name: "TEST JO13", slug: "test-jo13", createdAt: now });
  seed("coaches", { _id: coachId, name: "Test Coach", email: "coach@example.invalid", teamIds: [teamId], createdAt: now });
  for (const [id, refEmail] of [[refereeId, "referee@example.invalid"], [replacementRefereeId, "replacement@example.invalid"]]) {
    seed("referees", { _id: id, name: `Test ${id}`, email: refEmail, active: true, createdAt: now });
  }
  seed("userAccess", { _id: "admin-access", email: adminEmail, roles: ["admin"], active: true,
    source: "admin_manual", lastSyncedAt: now, createdAt: now, updatedAt: now });
  seed("matches", {
    _id: matchId, teamId, publicCode: "ADMIN1", coachId, refereeId,
    opponent: "Test opponent", isHome: true, scheduledAt: now + 86_400_000,
    status: options.status ?? "scheduled", currentQuarter: 1, quarterCount: 2,
    regulationDurationMinutes: 60, homeScore: 0, awayScore: 0, showLineup: true,
    formationId: "11v11_1-4-3-3", pitchType: "full", createdAt: now,
  });
  for (const [index, id] of playerIds.entries()) {
    seed("players", { _id: id, teamId, name: `Test player ${index + 1}`, number: index + 1, active: true, createdAt: now });
    seed("matchPlayers", { _id: `mp-${id}`, matchId, playerId: id, onField: index < 11,
      isKeeper: index === 0, ...(index < 11 ? { fieldSlotIndex: index } : {}), minutesPlayed: 0, createdAt: now });
  }
  const find = (id: string) => {
    for (const rows of tables.values()) {
      const row = rows.get(id);
      if (row) return row;
    }
    return null;
  };
  const patch = vi.fn(async (id: string, updates: Record<string, unknown>) => {
    const row = find(id);
    if (!row) throw new Error(`Missing row ${id}`);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete row[key];
      else row[key] = value;
    }
  });
  const insert = vi.fn(async (name: string, fields: Record<string, unknown>) => {
    const id = `${name}-${++nextId}`;
    seed(name, { _id: id, ...fields });
    return id;
  });
  const remove = vi.fn(async (id: string) => {
    for (const rows of tables.values()) rows.delete(id);
  });
  const query = vi.fn((name: string) => {
    const constraints: Array<[string, unknown]> = [];
    let descending = false;
    const eq = (field: string, value: unknown) => {
      constraints.push([field, value]);
      return { eq };
    };
    const values = () => {
      const rows = [...table(name).values()].filter((row) => constraints.every(([field, value]) => row[field] === value));
      return descending ? rows.reverse() : rows;
    };
    const result = {
      withIndex: (_index: string, configure?: (q: { eq: typeof eq }) => unknown) => { configure?.({ eq }); return result; },
      order: (direction: string) => { descending = direction === "desc"; return result; },
      take: async (limit: number) => values().slice(0, limit),
      first: async () => values()[0] ?? null,
      unique: async () => {
        const rows = values();
        if (rows.length > 1) throw new Error("Expected unique indexed row");
        return rows[0] ?? null;
      },
    };
    return result;
  });
  const ctx = {
    auth: { getUserIdentity: async () => email ? { email, subject: email, tokenIdentifier: `test|${email}` } : null },
    db: { get: vi.fn(async (id: string) => find(id)), patch, insert, delete: remove, query },
    scheduler: { runAt: vi.fn(), runAfter: vi.fn() },
  } as unknown as MutationCtx;
  const transaction = async <T,>(operation: () => Promise<T>) => {
    const backup = new Map([...tables].map(([name, rows]) => [name,
      new Map([...rows].map(([id, row]) => [id, JSON.parse(JSON.stringify(row)) as TestRow])),
    ]));
    try { return await operation(); }
    catch (error) {
      tables.clear();
      for (const [name, rows] of backup) tables.set(name, rows);
      throw error;
    }
  };
  return {
    ctx, patch, insert, remove, query, seed, find,
    login: (next: string | null) => { email = next; },
    rows: (name: string) => [...table(name).values()],
    catalog: () => readAdminCatalog(ctx, teamId),
    detail: () => readAdminMatch(ctx, matchId),
    entity: (args: EntityCommand) => transaction(() => executeAdminSaveEntity(ctx, args)),
    match: (args: MatchCommand) => transaction(() => executeAdminSaveMatch(ctx, args)),
    staff: (args: StaffCommand) => transaction(() => executeAdminAssignStaff(ctx, args)),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.stubEnv("CLERK_BOOTSTRAP_ADMIN_EMAILS", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

type Harness = ReturnType<typeof fixture>;
async function entityCommand(h: Harness, fields: Omit<EntityCommand, "revision" | "contextTeamId">) {
  return { ...fields, contextTeamId: teamId, revision: (await h.catalog()).revision };
}
async function matchCommand(h: Harness, overrides: Partial<MatchCommand> = {}): Promise<MatchCommand> {
  const detail = await h.detail();
  if (!detail) throw new Error("Missing fixture match");
  return {
    matchId, revision: detail.revision, correlationId: "save-match", teamId, opponent: "Test changed opponent",
    isHome: true, scheduledAt: now + 86_400_000, coachId, refereeId,
    quarterCount: 2, regulationDurationMinutes: 60,
    playerIds, starterIds: playerIds.slice(0, 11), keeperId: playerIds[0], ...overrides,
  };
}
async function staffCommand(h: Harness, overrides: Partial<StaffCommand> = {}): Promise<StaffCommand> {
  const detail = await h.detail();
  if (!detail) throw new Error("Missing fixture match");
  return { matchId, revision: detail.revision, correlationId: "assign-staff", coachId, refereeId: replacementRefereeId, ...overrides };
}

describe("mobile admin authorization", () => {
  it.each([null, "unlinked@example.invalid", "coach@example.invalid", "referee@example.invalid"])("rejects catalog access for %s", async (email) => {
    const h = fixture();
    h.login(email);
    await expect(h.catalog()).rejects.toThrow();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
  });
  it("rejects a revoked admin even when the record still contains the admin role", async () => {
    const h = fixture();
    h.find("admin-access")!.active = false;
    await expect(h.catalog()).rejects.toThrow();
    await expect(h.detail()).rejects.toThrow();
  });
  it("does not return legacy PINs or the complete account-access table", async () => {
    const h = fixture();
    h.find(coachId)!.pin = "private-coach-pin";
    h.find(refereeId)!.pin = "private-referee-pin";
    h.find(matchId)!.coachPin = "private-match-pin";
    for (const value of [await h.catalog(), await h.detail()]) {
      const encoded = JSON.stringify(value);
      expect(encoded).not.toContain("private-coach-pin");
      expect(encoded).not.toContain("private-referee-pin");
      expect(encoded).not.toContain("private-match-pin");
      expect(encoded).not.toContain("admin-access");
    }
  });
});

describe("mobile admin command boundaries", () => {
  it.each(["entity", "match", "staff"] as const)("rejects unauthorized %s writes before consuming a command", async (kind) => {
    const h = fixture();
    const entity = await entityCommand(h, { entity: "team", correlationId: "denied", clubId, name: "New team" });
    const match = await matchCommand(h);
    const staff = await staffCommand(h);
    h.login("coach@example.invalid");
    const execute = kind === "entity" ? () => h.entity(entity) : kind === "match" ? () => h.match(match) : () => h.staff(staff);
    await expect(execute()).rejects.toThrow();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
  });
  it("retries the identical entity creation once, rejects payload reuse and rechecks authorization", async () => {
    const h = fixture();
    const args = await entityCommand(h, { entity: "team", correlationId: "new-team", clubId, name: "TEST JO14" });
    const first = await h.entity(args);
    expect(await h.entity(args)).toEqual({ id: first.id, deduped: true });
    const reordered = Object.fromEntries(Object.entries(args).reverse()) as EntityCommand;
    expect(await h.entity(reordered)).toEqual({ id: first.id, deduped: true });
    expect(h.rows("teams")).toHaveLength(2);
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(1);
    await expect(h.entity({ ...args, name: "Different team" })).rejects.toThrow("andere wijziging");
    h.login("coach@example.invalid");
    await expect(h.entity(args)).rejects.toThrow();
    expect(h.rows("teams")).toHaveLength(2);
  });
  it("rejects stale entity and match snapshots without consuming retry ids", async () => {
    const h = fixture();
    const entity = await entityCommand(h, { entity: "team", correlationId: "stale-team", teamId, clubId, name: "Changed team" });
    h.find(teamId)!.name = "Concurrent change";
    await expect(h.entity(entity)).rejects.toThrow("inmiddels gewijzigd");
    const match = await matchCommand(h);
    h.find(matchId)!.opponent = "Concurrent opponent";
    await expect(h.match(match)).rejects.toThrow("inmiddels gewijzigd");
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(0);
    expect(h.find(teamId)!.name).toBe("Concurrent change");
    expect(h.find(matchId)!.opponent).toBe("Concurrent opponent");
  });
});

describe("canonical roles and people editing", () => {
  it.each(["coach", "referee"] as const)("adding a %s preserves an existing admin, the other staff role and its canonical id", async (entity) => {
    const h = fixture();
    const otherId = entity === "coach" ? refereeId : coachId;
    h.find(otherId)!.email = adminEmail;
    Object.assign(h.find("admin-access")!, entity === "coach"
      ? { roles: ["admin", "referee"], refereeId }
      : { roles: ["admin", "coach"], coachId });
    const result = await h.entity(await entityCommand(h, { entity, correlationId: `add-${entity}`, name: "Multi-role person", email: `  ${adminEmail.toUpperCase()}  `, teamIds: [teamId], active: true }));
    const access = await getCurrentUserAccess(h.ctx);
    expect(access?.roles).toEqual(["admin", "coach", "referee"]);
    expect(access?.coachId).toBe(entity === "coach" ? result.id : coachId);
    expect(access?.refereeId).toBe(entity === "referee" ? result.id : refereeId);
    expect(h.rows("userAccess")).toHaveLength(1);
    expect(h.find(result.id)?.email).toBe(adminEmail);
  });
  it("preserves a derived coach linkage even when the stored access snapshot did not contain it", async () => {
    const h = fixture();
    h.find(coachId)!.email = adminEmail;
    const result = await h.entity(await entityCommand(h, { entity: "referee", correlationId: "derive-coach", name: "Multi-role", email: adminEmail, active: true }));
    expect(h.find("admin-access")).toMatchObject({ roles: ["admin", "coach", "referee"], coachId, refereeId: result.id, active: true });
  });
  it("deactivates only the referee role and keeps admin/coach access and ids active", async () => {
    const h = fixture({ status: "finished" });
    h.find(coachId)!.email = adminEmail;
    h.find(refereeId)!.email = adminEmail;
    Object.assign(h.find("admin-access")!, { roles: ["admin", "coach", "referee"], coachId, refereeId });
    await h.entity(await entityCommand(h, { entity: "referee", refereeId, correlationId: "disable-ref", name: "Former referee", active: false }));
    expect(h.find("admin-access")).toMatchObject({ active: true, roles: ["admin", "coach"], coachId });
    expect(h.find("admin-access")).not.toHaveProperty("refereeId");
    expect(h.find(refereeId)?.active).toBe(false);
    expect((await getCurrentUserAccess(h.ctx))?.roles).toEqual(["admin", "coach"]);
    await expect(h.catalog()).resolves.toBeDefined();
  });
  it("cannot revive explicitly disabled access when adding a staff role", async () => {
    const h = fixture();
    h.seed("userAccess", { _id: "disabled", email: "disabled@example.invalid", roles: [], active: false });
    const args = await entityCommand(h, { entity: "coach", correlationId: "disabled-role", name: "Disabled account", email: "disabled@example.invalid", teamIds: [teamId] });
    await expect(h.entity(args)).rejects.toThrow("geblokkeerde toegang");
    expect(h.rows("coaches")).toHaveLength(1);
    expect(h.find("disabled")?.active).toBe(false);
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(0);
  });
  it.each(["coach", "referee"] as const)("refuses to overwrite a conflicting canonical %s id", async (entity) => {
    const h = fixture({ status: "finished" });
    const originalId = entity === "coach" ? coachId : refereeId;
    const conflictingId = entity === "coach" ? "another-coach" : "another-referee";
    h.find(originalId)!.email = adminEmail;
    Object.assign(h.find("admin-access")!, entity === "coach" ? { coachId: conflictingId } : { refereeId: conflictingId });
    const idFields = entity === "coach" ? { coachId } : { refereeId };
    await expect(h.entity(await entityCommand(h, { entity, ...idFields, correlationId: "conflict", name: "Changed name", active: true }))).rejects.toThrow("ander rolprofiel");
    expect(h.find(originalId)?.name).not.toBe("Changed name");
    expect(h.find("admin-access")?.[entity === "coach" ? "coachId" : "refereeId"]).toBe(conflictingId);
  });
  it.each(["coach", "referee"] as const)("cannot change a %s login email or create a duplicate canonical identity", async (entity) => {
    const h = fixture();
    const idFields = entity === "coach" ? { coachId } : { refereeId };
    const email = `${entity}@example.invalid`;
    await expect(h.entity(await entityCommand(h, { entity, ...idFields, correlationId: "email-edit", name: "Renamed", email: "another@example.invalid" }))).rejects.toThrow("e-mailadres");
    await expect(h.entity(await entityCommand(h, { entity, correlationId: "duplicate", name: "Duplicate", email: ` ${email.toUpperCase()} `, teamIds: [teamId] }))).rejects.toThrow("al een");
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(0);
  });
  it("protects open coach/referee assignments and an active player's availability", async () => {
    const h = fixture({ status: "live" });
    await expect(h.entity(await entityCommand(h, { entity: "coach", coachId, correlationId: "remove-team", name: "Coach", teamIds: [] }))).rejects.toThrow("open wedstrijden");
    await expect(h.entity(await entityCommand(h, { entity: "referee", refereeId, correlationId: "disable-assigned", name: "Referee", active: false }))).rejects.toThrow("open wedstrijden");
    await expect(h.entity(await entityCommand(h, { entity: "player", playerId: playerIds[0], teamId, correlationId: "disable-player", name: "Keeper", active: false }))).rejects.toThrow("actieve wedstrijd");
    expect(h.find(coachId)?.teamIds).toEqual([teamId]);
    expect(h.find(refereeId)?.active).toBe(true);
    expect(h.find(playerIds[0])?.active).toBe(true);
  });
});

describe("admin match setup and reassignment", () => {
  it("creates an explicit 11-player field and bench once and keeps exact retries safe after kickoff", async () => {
    const h = fixture();
    const args = await matchCommand(h, { matchId: undefined, revision: undefined, correlationId: "create-admin-match", scheduledAt: now + 3 * 86_400_000 });
    const result = await h.match(args);
    const selection = h.rows("matchPlayers").filter(row => row.matchId === result.matchId);
    expect(selection.filter(row => row.onField)).toHaveLength(11);
    expect(selection.filter(row => !row.onField)).toHaveLength(4);
    expect(selection.find(row => row.isKeeper)).toMatchObject({ playerId: playerIds[0], fieldSlotIndex: 0, onField: true });
    expect(h.find(result.matchId)).toMatchObject({ status: "scheduled", quarterCount: 2, regulationDurationMinutes: 60, coachId, leadCoachId: coachId, refereeId });
    h.find(result.matchId)!.status = "live";
    expect(await h.match(args)).toEqual({ matchId: result.matchId, deduped: true });
    expect(h.rows("matches")).toHaveLength(2);
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(1);
  });
  it("updates pre-start selection without losing kept player ids or occupied field slots", async () => {
    const h = fixture();
    const selected = playerIds.slice(0, 14);
    const starters = [...playerIds.slice(0, 10), playerIds[11]];
    await h.match(await matchCommand(h, { playerIds: selected, starterIds: starters }));
    expect(h.find(`mp-${playerIds[5]}`)).toMatchObject({ playerId: playerIds[5], onField: true, fieldSlotIndex: 5 });
    expect(h.find(`mp-${playerIds[10]}`)).toMatchObject({ onField: false, isKeeper: false });
    expect(h.find(`mp-${playerIds[10]}`)).not.toHaveProperty("fieldSlotIndex");
    expect(h.find(`mp-${playerIds[11]}`)).toMatchObject({ onField: true, fieldSlotIndex: 10 });
    expect(h.find(`mp-${playerIds[14]}`)).toBeNull();
    expect((await h.detail())?.playerIds).not.toContain(playerIds[14]);
  });
  it.each(["live", "halftime", "finished"] as const)("rejects settings and selection edits in %s", async (status) => {
    const h = fixture({ status });
    const before = JSON.stringify(h.rows("matchPlayers"));
    await expect(h.match(await matchCommand(h))).rejects.toThrow("voor de aftrap");
    expect(JSON.stringify(h.rows("matchPlayers"))).toBe(before);
    expect(h.find(matchId)?.opponent).toBe("Test opponent");
  });
  it("rejects missing, duplicate, inactive, foreign and invalid keeper selections without writes", async () => {
    const h = fixture();
    const base = await matchCommand(h);
    const attempts: MatchCommand[] = [
      { ...base, playerIds: playerIds.slice(0, 10) },
      { ...base, playerIds: [...playerIds, playerIds[0]] },
      { ...base, starterIds: [...playerIds.slice(0, 10), playerIds[0]] },
      { ...base, keeperId: playerIds[14] },
      { ...base, playerIds: playerIds.slice(1) },
      { ...base, playerIds: [...playerIds.slice(0, 14), "missing" as Id<"players">] },
    ];
    for (const args of attempts) await expect(h.match(args)).rejects.toThrow();
    h.find(playerIds[14])!.active = false;
    await expect(h.match(base)).rejects.toThrow("niet actief");
    h.find(playerIds[14])!.active = true;
    h.find(playerIds[14])!.teamId = "another-team";
    await expect(h.match(base)).rejects.toThrow("niet actief");
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
  });
  it("preserves pending plans by rejecting removal of a planned player or a duration change", async () => {
    const h = fixture();
    h.seed("substitutionPlans", { _id: "plan", matchId, playerInId: playerIds[14], playerOutId: playerIds[9], status: "pending", targetQuarter: 2, targetMinute: 10 });
    await expect(h.match(await matchCommand(h, { playerIds: playerIds.slice(0, 14) }))).rejects.toThrow("wisselplan");
    await expect(h.match(await matchCommand(h, { regulationDurationMinutes: 90 }))).rejects.toThrow("speeltijd");
    await expect(h.match(await matchCommand(h, { starterIds: [...playerIds.slice(0, 10), playerIds[11]] }))).rejects.toThrow("basisopstelling");
    await expect(h.match(await matchCommand(h, { keeperId: playerIds[1] }))).rejects.toThrow("basisopstelling");
    expect(h.find("plan")).not.toBeNull();
    expect(h.rows("matchPlayers")).toHaveLength(15);
  });
  it.each(["absent", "injured"] as const)("does not promote an %s player to the field", async (field) => {
    const h = fixture();
    h.find(`mp-${playerIds[11]}`)![field] = true;
    await expect(h.match(await matchCommand(h, { starterIds: [...playerIds.slice(0, 10), playerIds[11]] }))).rejects.toThrow("afwezig of geblesseerd");
    expect(h.find(`mp-${playerIds[11]}`)?.onField).toBe(false);
    expect(h.patch).not.toHaveBeenCalled();
  });
  it("does not reset a misleading pre-start match that already contains match history", async () => {
    const h = fixture();
    h.seed("matchEvents", { _id: "historic-goal", matchId, type: "goal", timestamp: now, createdAt: now });
    await expect(h.match(await matchCommand(h))).rejects.toThrow("wedstrijdhistorie");
    expect(h.find("historic-goal")).not.toBeNull();
    expect(h.remove).not.toHaveBeenCalled();
    expect(h.patch).not.toHaveBeenCalled();
  });
  it("switches the live referee immediately, rejects stale takeover, and preserves completed retries", async () => {
    const h = fixture({ status: "live" });
    h.login("referee@example.invalid");
    expect(await verifyClockPin(h.ctx, h.find(matchId) as unknown as Doc<"matches">)).toBe(true);
    h.login(adminEmail);
    const args = await staffCommand(h);
    await h.staff(args);
    await expect(h.staff({ ...args, correlationId: "stale-assignment", refereeId })).rejects.toThrow("inmiddels gewijzigd");
    h.login("referee@example.invalid");
    expect(await verifyClockPin(h.ctx, h.find(matchId) as unknown as Doc<"matches">)).toBe(false);
    h.login("replacement@example.invalid");
    expect(await verifyClockPin(h.ctx, h.find(matchId) as unknown as Doc<"matches">)).toBe(true);
    h.login(adminEmail);
    h.find(matchId)!.status = "finished";
    expect(await h.staff(args)).toEqual({ deduped: true });
    await expect(h.staff(await staffCommand(h, { correlationId: "new-after-finish", refereeId }))).rejects.toThrow("afgelopen wedstrijd");
    expect(h.find(matchId)?.refereeId).toBe(replacementRefereeId);
  });
  it("transfers coach leadership only when the assigned coach changes", async () => {
    const h = fixture({ status: "live" });
    h.find(matchId)!.leadCoachId = coachId;
    const newCoachId = "new-coach" as Id<"coaches">;
    h.seed("coaches", { _id: newCoachId, name: "New Coach", email: "new-coach@example.invalid", teamIds: [teamId], createdAt: now });
    await h.staff(await staffCommand(h));
    expect(h.find(matchId)?.leadCoachId).toBe(coachId);
    await h.staff(await staffCommand(h, { correlationId: "coach-takeover", coachId: newCoachId }));
    expect(h.find(matchId)).toMatchObject({ coachId: newCoachId, leadCoachId: newCoachId });
  });
  it("rejects invalid staff and overlapping or simultaneously live referee assignments", async () => {
    const h = fixture({ status: "live" });
    const foreignCoach = "foreign-coach" as Id<"coaches">;
    h.seed("coaches", { _id: foreignCoach, email: "foreign@example.invalid", name: "Other Coach", teamIds: [] });
    await expect(h.staff(await staffCommand(h, { coachId: foreignCoach }))).rejects.toThrow("aan dit team");
    h.find(replacementRefereeId)!.active = false;
    await expect(h.staff(await staffCommand(h))).rejects.toThrow("actieve scheidsrechter");
    h.find(replacementRefereeId)!.active = true;
    h.seed("matches", { ...h.find(matchId)!, _id: "other-match", status: "scheduled", refereeId: replacementRefereeId, scheduledAt: now + 86_400_000 + 10 * 60_000 });
    await expect(h.staff(await staffCommand(h))).rejects.toThrow("overlappende wedstrijd");
    Object.assign(h.find("other-match")!, { status: "live", scheduledAt: now - 10 * 86_400_000 });
    await expect(h.staff(await staffCommand(h))).rejects.toThrow("andere actieve wedstrijd");
    expect(h.find(matchId)?.refereeId).toBe(refereeId);
    expect(h.rows("mobileAdminCommandDedupes")).toHaveLength(0);
  });
});
