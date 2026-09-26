import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { verifyClockPin, verifyIsMatchLead } from "./pinHelpers";
import { getCurrentUserAccess, requireCoachForMatch, requireRefereeForMatch } from "./lib/userAccess";
import { addGoal, removeLastGoal } from "./matchEvents";
import { addCard } from "./matchCardActions";

vi.mock("./lib/userAccess", () => ({
  getCurrentUserAccess: vi.fn(),
  requireCoachForMatch: vi.fn(),
  requireRefereeForMatch: vi.fn(),
}));

const coach = { _id: "coach1" } as Doc<"coaches">;
const match = {
  _id: "match1", teamId: "team1", refereeId: "ref1", leadCoachId: "coach1", status: "live",
} as Doc<"matches">;
const ctx = { db: { get: vi.fn(async () => match), patch: vi.fn(), insert: vi.fn() } };
const typedCtx = ctx as unknown as MutationCtx;

beforeEach(() => {
  vi.resetAllMocks();
  ctx.db.get.mockResolvedValue(match);
  vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "coach@example.test", active: true, roles: ["coach"] });
  vi.mocked(requireCoachForMatch).mockResolvedValue(coach);
  vi.mocked(requireRefereeForMatch).mockRejectedValue(new Error("Niet toegewezen"));
});

describe("coach and referee share one match with separate duties", () => {
  it("keeps substitutions with the lead coach while the referee owns official duty", async () => {
    expect(await verifyClockPin(typedCtx, match)).toBe(false);
    expect(await verifyIsMatchLead(typedCtx, match)).toBe(coach);
  });

  it("lets the lead coach control a match without a referee", async () => {
    expect(await verifyClockPin(typedCtx, { ...match, refereeId: undefined })).toBe(true);
    expect(await verifyClockPin(typedCtx, { ...match, refereeId: undefined, leadCoachId: undefined })).toBe(false);
  });

  it("allows the assigned referee but rejects an unrelated referee", async () => {
    vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "ref@example.test", active: true, roles: ["referee"] });
    expect(await verifyClockPin(typedCtx, match)).toBe(false);
    vi.mocked(requireRefereeForMatch).mockResolvedValue({ _id: "ref1" } as Doc<"referees">);
    expect(await verifyClockPin(typedCtx, match)).toBe(true);
  });

  it("denies anonymous control and preserves the admin override", async () => {
    vi.mocked(getCurrentUserAccess).mockResolvedValue(null);
    expect(await verifyClockPin(typedCtx, match)).toBe(false);
    vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "admin@example.test", active: true, roles: ["admin"] });
    expect(await verifyClockPin(typedCtx, match)).toBe(true);
  });

  it.each([addGoal, removeLastGoal, addCard])("rejects coach scoring/card writes when a referee is assigned", async (fn) => {
    const handler = (fn as unknown as {
      _handler: (context: unknown, args: Record<string, unknown>) => Promise<unknown>;
    })._handler;
    await expect(handler(ctx, { matchId: match._id, cardType: "yellow_card" })).rejects.toThrow("Geen toegang");
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});
