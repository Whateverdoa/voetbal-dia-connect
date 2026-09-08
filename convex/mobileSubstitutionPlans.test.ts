import { createHash, webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { executePlanCommand, planTiming } from "./mobileSubstitutionPlans";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";

vi.mock("./pinHelpers", () => ({
  verifyCoachTeamMembership: vi.fn(),
  verifyIsMatchLead: vi.fn(),
}));
vi.mock("./lib/commandIdempotency", () => ({
  consumeCommandIdempotency: vi.fn(),
}));
const matchId = "match" as Id<"matches">;
function context(status = "live") {
  const match = {
    _id: matchId,
    status,
    currentQuarter: 1,
    quarterCount: 2,
    regulationDurationMinutes: 60,
  };
  const patch = vi.fn();
  const insert = vi.fn();
  const ctx = {
    db: {
      get: vi.fn().mockResolvedValue(match),
      query: vi
        .fn()
        .mockReturnValue({
          withIndex: vi
            .fn()
            .mockReturnValue({ take: vi.fn().mockResolvedValue([]) }),
        }),
      patch,
      insert,
    },
  };
  const revision = createHash("sha256")
    .update(
      JSON.stringify([
        status,
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        2,
        60,
        [],
        [],
      ]),
    )
    .digest("hex");
  return { ctx: ctx as unknown as MutationCtx, revision, patch, insert };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.mocked(verifyCoachTeamMembership).mockResolvedValue({
    _id: "coach",
  } as Doc<"coaches">);
  vi.mocked(verifyIsMatchLead).mockResolvedValue({
    _id: "coach",
  } as Doc<"coaches">);
  vi.mocked(consumeCommandIdempotency).mockResolvedValue(true);
});
describe("mobile plan command boundary", () => {
  it("rejects an unlinked identity before consuming a command", async () => {
    vi.mocked(verifyCoachTeamMembership).mockResolvedValue(null);
    const { ctx } = context();
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision: "old",
        operation: "save",
      }),
    ).rejects.toThrow("Geen toegang");
    expect(consumeCommandIdempotency).not.toHaveBeenCalled();
  });
  it("requires leadership for execution", async () => {
    vi.mocked(verifyIsMatchLead).mockResolvedValue(null);
    const { ctx } = context();
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision: "old",
        operation: "execute",
      }),
    ).rejects.toThrow("wedstrijdleider");
    expect(consumeCommandIdempotency).not.toHaveBeenCalled();
  });
  it("dedupes a retry even after the saved snapshot has changed", async () => {
    vi.mocked(consumeCommandIdempotency).mockResolvedValue(false);
    const { ctx, patch, insert } = context();
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision: "old",
        operation: "save",
      }),
    ).resolves.toEqual({ deduped: true });
    expect(patch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
  it("rejects stale plan or lineup changes before writing rows", async () => {
    const { ctx, patch } = context();
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision: "old",
        operation: "save",
      }),
    ).rejects.toThrow("opstelling is gewijzigd");
    expect(patch).not.toHaveBeenCalled();
  });
  it("rejects edits after finish", async () => {
    const { ctx, revision } = context("finished");
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision,
        operation: "save",
      }),
    ).rejects.toThrow("afgelopen");
  });
  it("rejects a plan row from another match", async () => {
    const { ctx, revision } = context();
    await expect(
      executePlanCommand(ctx, {
        matchId,
        correlationId: "a",
        revision,
        operation: "skip",
        planId: "other" as Id<"substitutionPlans">,
      }),
    ).rejects.toThrow("niet meer beschikbaar");
  });
});
describe("absolute-minute storage", () => {
  it("stores minute 45 as second half minute 45, not minute 15", () =>
    expect(planTiming(45, false, 60, 2)).toEqual({
      targetQuarter: 2,
      targetMinute: 45,
    }));
  it("distinguishes a halftime row from second-half kickoff", () => {
    expect(planTiming(30, true, 60, 2)).toEqual({
      targetQuarter: 2,
      targetMinute: undefined,
    });
    expect(planTiming(30, false, 60, 2)).toEqual({
      targetQuarter: 2,
      targetMinute: 30,
    });
  });
  it("maps quarter boundaries in four-period matches", () =>
    expect(planTiming(45, true, 60, 4)).toEqual({
      targetQuarter: 4,
      targetMinute: undefined,
    }));
  it.each([-1, 61, 1.5, NaN, Infinity])("rejects minute %s", (minute) =>
    expect(() => planTiming(minute, false, 60, 2)).toThrow(
      "hele wedstrijdminuut",
    ),
  );
  it.each([0, 10, 60])("rejects invalid break %s", (minute) =>
    expect(() => planTiming(minute, true, 60, 2)).toThrow("rustmoment"),
  );
});
