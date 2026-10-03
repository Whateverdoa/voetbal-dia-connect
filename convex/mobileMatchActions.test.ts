import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { executeCommand } from "./mobileMatchActions";
import { verifyClockPin } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";

vi.mock("./pinHelpers", () => ({ verifyClockPin: vi.fn() }));
vi.mock("./lib/commandIdempotency", () => ({ consumeCommandIdempotency: vi.fn() }));
const matchId = "match-test" as Id<"matches">;
const base = { matchId, command: "end_period" as const, expectedStatus: "live" as const, expectedQuarter: 1, correlationId: "one-command" };
function context(status = "live", quarter = 1) {
  const runMutation = vi.fn();
  const ctx = { db: { get: vi.fn().mockResolvedValue({ _id: matchId, status, currentQuarter: quarter }) }, runMutation };
  return { ctx: ctx as unknown as MutationCtx, runMutation };
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(verifyClockPin).mockResolvedValue(true); vi.mocked(consumeCommandIdempotency).mockResolvedValue(true); });
describe("mobile command boundary", () => {
  it("rejects unauthorized users before consuming a command or calling the engine", async () => {
    vi.mocked(verifyClockPin).mockResolvedValue(false);
    const { ctx, runMutation } = context();
    await expect(executeCommand(ctx, base)).rejects.toThrow("Geen toegang");
    expect(consumeCommandIdempotency).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
  });
  it("accepts the retry of an already applied transition despite the changed phase", async () => {
    vi.mocked(consumeCommandIdempotency).mockResolvedValue(false);
    const { ctx, runMutation } = context("halftime", 2);
    await expect(executeCommand(ctx, base)).resolves.toEqual({ deduped: true });
    expect(runMutation).not.toHaveBeenCalled();
  });
  it("rejects a fresh command from a stale period", async () => {
    const { ctx, runMutation } = context("live", 2);
    await expect(executeCommand(ctx, base)).rejects.toThrow("inmiddels gewijzigd");
    expect(runMutation).not.toHaveBeenCalled();
  });
  it("cannot finish a match while already in halftime", async () => {
    const { ctx, runMutation } = context("halftime", 2);
    await expect(executeCommand(ctx, { ...base, expectedStatus: "halftime", expectedQuarter: 2 })).rejects.toThrow("geen speelhelft");
    expect(runMutation).not.toHaveBeenCalled();
  });
  it("rejects restarting a finished match", async () => {
    const { ctx, runMutation } = context("finished", 2);
    await expect(executeCommand(ctx, { ...base, command: "start", expectedStatus: "finished", expectedQuarter: 2 })).rejects.toThrow("al gestart");
    expect(runMutation).not.toHaveBeenCalled();
  });
  it("delegates a valid period transition once with its original command id", async () => {
    const { ctx, runMutation } = context();
    await expect(executeCommand(ctx, base)).resolves.toEqual({ deduped: false });
    expect(runMutation).toHaveBeenCalledExactlyOnceWith(expect.anything(), { matchId, correlationId: "one-command" });
  });
  it("rejects goals in halftime without changing score", async () => {
    const { ctx, runMutation } = context("halftime", 2);
    await expect(executeCommand(ctx, { ...base, command: "goal", team: "home", expectedStatus: "halftime", expectedQuarter: 2 })).rejects.toThrow("speelhelft");
    expect(runMutation).not.toHaveBeenCalled();
  });
});
