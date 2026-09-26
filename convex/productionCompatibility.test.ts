import { afterEach, describe, expect, it, vi } from "vitest";
import { getClaimWindowForWeek, closeClaimWindow, openClaimWindow } from "./refereeClaimWindows";
import { getOpenClaimWindowPublic } from "./refereePool";
import { getPlayWeekBounds } from "./lib/playWeek";
import { recordedPlayerName } from "./lib/matchEventProjection";

vi.mock("./adminAuth", () => ({ requireAdminAccess: vi.fn() }));
vi.mock("./lib/adminAccess", () => ({ getAuthenticatedEmail: vi.fn(() => "admin@example.test") }));
vi.mock("./lib/userAccess", () => ({ requireRefereeAccess: vi.fn() }));

function invoke(fn: unknown, ctx: unknown) {
  return (fn as { _handler: (ctx: unknown, args: Record<string, never>) => Promise<unknown> })._handler(ctx, {});
}

afterEach(() => vi.useRealTimers());

describe("production rollback compatibility", () => {
  it("keeps existing manually recorded identities readable", () => {
    expect(recordedPlayerName({ reportedName: "Sam", reportedNumber: 8 })).toBe("Sam");
    expect(recordedPlayerName({ reportedNumber: 8 })).toBe("Nr. 8");
    expect(recordedPlayerName({ reportedName: "Sam" }, "Jan")).toBe("Jan");
    expect(recordedPlayerName({})).toBeUndefined();
  });
  it("reads a saved round without a deadline through both existing interfaces", async () => {
    vi.useFakeTimers();
    const now = Date.parse("2026-09-26T09:00:00+02:00");
    vi.setSystemTime(now);
    const bounds = getPlayWeekBounds(now);
    const row = { _id: "window1", ...bounds, opensAt: bounds.weekStartMs, status: "open" };
    const ctx = { db: { query: () => ({ withIndex: () => ({ unique: async () => row }) }) } };

    expect(await invoke(getClaimWindowForWeek, ctx)).toMatchObject({ isEffectivelyOpen: true });
    expect(await invoke(getOpenClaimWindowPublic, ctx)).toMatchObject({ isOpen: true });
  });

  it("closes a saved round without writing an invalid numeric deadline", async () => {
    vi.useFakeTimers();
    const now = Date.parse("2026-09-26T09:00:00+02:00");
    vi.setSystemTime(now);
    const row = { _id: "window1", ...getPlayWeekBounds(now), status: "open" };
    const patch = vi.fn();
    const ctx = { db: { query: () => ({ withIndex: () => ({ unique: async () => row }) }), patch } };

    await invoke(closeClaimWindow, ctx);
    expect(patch).toHaveBeenCalledWith("window1", { status: "closed", closesAt: now, updatedAt: now });
  });

  it("opens new rounds without an automatic deadline", async () => {
    vi.useFakeTimers();
    const now = Date.parse("2026-09-21T09:00:00+02:00");
    vi.setSystemTime(now);
    const insert = vi.fn(async () => "window1");
    const ctx = {
      db: { query: () => ({ withIndex: () => ({ unique: async () => null }) }), insert },
      scheduler: { runAfter: vi.fn() },
    };

    await invoke(openClaimWindow, ctx);
    expect(insert).toHaveBeenCalledWith("refereeClaimWindows", expect.objectContaining({
      closesAt: undefined,
    }));
  });
});
