import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openClaimWindow, closeClaimWindow, getClaimWindowForWeek } from "./refereeClaimWindows";
import { claimMatch, getOpenClaimWindowPublic } from "./refereePool";
import { createWindowClosingReminders } from "./refereeNotifications";
import { requireAdminAccess } from "./adminAuth";
import { getPlayWeekBounds, isClaimWindowOpen } from "./lib/playWeek";

vi.mock("./adminAuth", () => ({ requireAdminAccess: vi.fn() }));
vi.mock("./lib/adminAccess", () => ({ getAuthenticatedEmail: vi.fn(() => "admin@example.test") }));
vi.mock("./lib/userAccess", () => ({
  requireRefereeAccess: vi.fn(() => ({
    referee: { _id: "referee1", active: true, inClaimPool: true, qualificationTags: ["JO13", "11v11"] },
  })),
}));

// Invoke real registered handlers with an in-memory database boundary.
function invoke(fn: unknown, ctx: unknown, args: Record<string, unknown> = {}) {
  return (fn as { _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown> })._handler(ctx, args);
}

const saturday = Date.parse("2026-09-26T09:00:00+02:00");
const bounds = getPlayWeekBounds(saturday);
type WindowRow = {
  _id: string;
  status: "open" | "closed";
  opensAt: number;
  weekStartMs: number;
  weekEndMs: number;
  closesAt?: number;
  closingReminderSentAt?: number;
};

function setup(existing: WindowRow | null = null, matchStatus = "scheduled") {
  const state = { window: existing };
  const match = {
    _id: "match1", teamId: "team1", opponent: "Voorbeeldclub", status: matchStatus,
    scheduledAt: saturday + 3600000, quarterCount: 2,
  };
  const db = {
    query: vi.fn((table: string) => ({
      withIndex: vi.fn(() => ({
        unique: vi.fn(async () => state.window),
        collect: vi.fn(async () => table === "refereeClaimWindows" ? (state.window ? [state.window] : []) : []),
      })),
    })),
    get: vi.fn(async (id: string) => id === "team1" ? { name: "JO13-1" } : match),
    insert: vi.fn(async (_table: string, value: Omit<WindowRow, "_id">) => {
      state.window = { ...value, _id: "window1" };
      return "window1";
    }),
    patch: vi.fn(async (id: string, patch: Partial<WindowRow>) => {
      if (id === "window1" && state.window) Object.assign(state.window, patch);
    }),
  };
  const ctx = { db, scheduler: { runAfter: vi.fn() } };
  return { state, ctx };
}

function openRow(extra: Partial<WindowRow> = {}): WindowRow {
  return { _id: "window1", status: "open", opensAt: bounds.weekStartMs, ...bounds, ...extra };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(saturday);
  vi.mocked(requireAdminAccess).mockReset();
});
afterEach(() => vi.useRealTimers());

describe("manual claim rounds on match day", () => {
  it("opens on Saturday without a deadline and remains visible to admin and referee", async () => {
    const { ctx, state } = setup();
    await invoke(openClaimWindow, ctx);
    expect(state.window?.closesAt).toBeUndefined();
    expect(await invoke(getClaimWindowForWeek, ctx)).toMatchObject({ isEffectivelyOpen: true });
    expect(await invoke(getOpenClaimWindowPublic, ctx)).toMatchObject({ isOpen: true });
  });

  it("reopens an expired old round and clears the old deadline and reminder", async () => {
    const { ctx, state } = setup(openRow({ status: "closed", closesAt: saturday - 86400000, closingReminderSentAt: saturday - 172800000 }));
    await invoke(openClaimWindow, ctx);
    expect(state.window).toMatchObject({ status: "open", closesAt: undefined, closingReminderSentAt: undefined });
    expect(await invoke(getOpenClaimWindowPublic, ctx)).toMatchObject({ isOpen: true });
  });

  it("allows a qualified referee to claim a scheduled match on Saturday", async () => {
    const { ctx } = setup(openRow());
    await invoke(claimMatch, ctx, { matchId: "match1" });
    expect(ctx.db.patch).toHaveBeenCalledWith("match1", { refereeId: "referee1" });
  });

  it("still rejects claiming a match that has started", async () => {
    const { ctx } = setup(openRow(), "live");
    await expect(invoke(claimMatch, ctx, { matchId: "match1" })).rejects.toThrow("Alleen geplande wedstrijden");
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("manual closure stops claims without removing existing assignments", async () => {
    const { ctx } = setup(openRow());
    await invoke(closeClaimWindow, ctx);
    expect(await invoke(getOpenClaimWindowPublic, ctx)).toMatchObject({ isOpen: false });
    await expect(invoke(claimMatch, ctx, { matchId: "match1" })).rejects.toThrow("geen open claimronde");
    expect(ctx.db.patch).toHaveBeenCalledTimes(1);
    expect(ctx.db.patch.mock.calls[0][0]).toBe("window1");
  });

  it("does not close or send closing reminders for manual rounds during the weekend", async () => {
    const { ctx } = setup(openRow());
    vi.setSystemTime(Date.parse("2026-09-27T10:00:00+02:00"));
    await invoke(createWindowClosingReminders, ctx);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("expires the old play week when the next week begins", async () => {
    const { ctx, state } = setup(openRow());
    vi.setSystemTime(bounds.weekEndMs);
    expect(isClaimWindowOpen(state.window!, bounds.weekEndMs)).toBe(false);
    await invoke(createWindowClosingReminders, ctx);
    expect(state.window?.status).toBe("closed");
  });

  it("preserves an explicitly configured deadline", async () => {
    const { ctx, state } = setup();
    const deadline = saturday + 3600000;
    await invoke(openClaimWindow, ctx, { closesAt: deadline });
    expect(isClaimWindowOpen(state.window!, deadline - 1)).toBe(true);
    expect(isClaimWindowOpen(state.window!, deadline)).toBe(false);
  });

  it("still requires admin access before changing the window", async () => {
    vi.mocked(requireAdminAccess).mockRejectedValueOnce(new Error("Geen toegang"));
    const { ctx } = setup();
    await expect(invoke(openClaimWindow, ctx)).rejects.toThrow("Geen toegang");
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});
