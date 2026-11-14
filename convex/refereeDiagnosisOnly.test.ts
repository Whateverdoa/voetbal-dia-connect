// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { diagnose } from "./refereeRegistration";
import { getCurrentUserAccess } from "./lib/userAccess";
vi.mock("./lib/userAccess", () => ({ getCurrentUserAccess: vi.fn() }));
const id = "jn7cw69dexmjjmg88jbwsxj4kx8gecgr";
const email = "mjtenhoonte@gmail.com";
const current = { email, active: true, roles: ["coach", "referee"], refereeId: "ref", coachId: "coach" };
const handler = (diagnose as unknown as { _handler(ctx: unknown, args: { matchId: string }): Promise<{ readOnly: boolean; isOfficialRegistrar: boolean; eligibleToControl: boolean; controller: string; policyActive: boolean; mobileScopeStatus: string }> })._handler;
function fixture(identity: Record<string, unknown> | null = { subject: "synthetic-owner", email, emailVerified: true }) {
  const rows: Record<string, Record<string, unknown>> = {
    [id]: { _id: id, teamId: "team", refereeId: "ref", leadCoachId: "coach", status: "scheduled" },
    team: { _id: "team", active: true }, ref: { _id: "ref", active: true }, coach: { _id: "coach", teamIds: ["team"] },
  };
  const db = { get: vi.fn(async (key: string) => rows[key] ?? null) };
  const ctx = { auth: { getUserIdentity: async () => identity }, db };
  return { rows, db, call: (matchId = id) => handler(ctx, { matchId }) };
}
beforeEach(() => { vi.mocked(getCurrentUserAccess).mockReset(); vi.mocked(getCurrentUserAccess).mockResolvedValue(current as never); });
describe("diagnosis-only production endpoint", () => {
  it("confirms only assigned duty without granting policy or mobile access", async () => {
    const f = fixture(); const before = structuredClone(f.rows);
    expect(await f.call()).toMatchObject({ readOnly: true, isOfficialRegistrar: true, eligibleToControl: true, controller: "referee", policyActive: false, mobileScopeStatus: "unavailable" });
    expect(f.rows).toEqual(before);
  });
  it("rejects anonymous, unverified and other accounts before database access", async () => {
    for (const identity of [null, { subject: "user", email, emailVerified: false }, { subject: "user", email: "other@example.test", emailVerified: true }]) {
      const f = fixture(identity); await expect(f.call()).rejects.toThrow(); expect(f.db.get).not.toHaveBeenCalled();
    }
  });
  it("rejects another match before access resolution or database reads", async () => {
    const f = fixture(); await expect(f.call("another-match")).rejects.toThrow("FORBIDDEN");
    expect(getCurrentUserAccess).not.toHaveBeenCalled(); expect(f.db.get).not.toHaveBeenCalled();
  });
  it("rejects revoked access and inactive team", async () => {
    const f = fixture(); vi.mocked(getCurrentUserAccess).mockResolvedValue({ ...current, active: false } as never);
    await expect(f.call()).rejects.toThrow("FORBIDDEN"); vi.mocked(getCurrentUserAccess).mockResolvedValue(current as never);
    f.rows.team.active = false; await expect(f.call()).rejects.toThrow("FORBIDDEN");
  });
  it("admin read access is not registrar authority", async () => {
    vi.mocked(getCurrentUserAccess).mockResolvedValue({ ...current, roles: ["admin"] } as never);
    expect(await fixture().call()).toMatchObject({ isOfficialRegistrar: false, eligibleToControl: false });
  });
  it("an inactive assigned referee does not allow coach fallback", async () => {
    const f = fixture(); f.rows.ref.active = false;
    expect(await f.call()).toMatchObject({ controller: "referee", isOfficialRegistrar: false, eligibleToControl: false });
  });
  it("fallback requires no assigned referee and explicit own-team coach", async () => {
    const f = fixture(); delete f.rows[id].refereeId;
    expect(await f.call()).toMatchObject({ controller: "coach", isOfficialRegistrar: true });
    delete f.rows[id].leadCoachId; expect(await f.call()).toMatchObject({ controller: "none", isOfficialRegistrar: false });
  });
  it.each(["finished", "cancelled"])("does not grant controls for %s fixtures", async state => {
    const f = fixture(); if (state === "finished") f.rows[id].status = state; else f.rows[id].cancelledAt = 1;
    expect(await f.call()).toMatchObject({ isOfficialRegistrar: true, eligibleToControl: false });
  });
});
