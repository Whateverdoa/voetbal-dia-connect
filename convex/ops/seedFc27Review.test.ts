import { afterEach, describe, expect, it, vi } from "vitest";
import { apply } from "./seedFc27Review";

const invoke = (ctx: unknown, args = { coachEmails: ["coach@example.test"] }) =>
  (apply as unknown as { _handler: (ctx: unknown, args: { coachEmails: string[] }) => Promise<unknown> })._handler(ctx, args);

afterEach(() => vi.unstubAllEnvs());

describe("isolated review seed", () => {
  it("rejects production even when the test flag is accidentally enabled", async () => {
    vi.stubEnv("DIA_TEST_MODE", "true");
    vi.stubEnv("CONVEX_SITE_URL", "https://nautical-condor-5.convex.site");
    await expect(invoke({})).rejects.toThrow("afzonderlijke FC27-testbackend");
  });
  it("requires explicit test mode even on the review deployment", async () => {
    vi.stubEnv("DIA_TEST_MODE", "false");
    vi.stubEnv("CONVEX_SITE_URL", "https://sincere-spider-515.convex.site");
    await expect(invoke({})).rejects.toThrow("afzonderlijke FC27-testbackend");
  });
  it("does not reset an existing team's reviews or data on repeated execution", async () => {
    vi.stubEnv("DIA_TEST_MODE", "true");
    vi.stubEnv("CONVEX_SITE_URL", "https://sincere-spider-515.convex.site");
    const insert = vi.fn();
    const patch = vi.fn();
    const db = { insert, patch, query: () => ({ withIndex: () => ({
      unique: async () => ({ _id: "team-1" }),
      take: async () => [
        { _id: "old-avatar", photoUrl: "/cards/review-portrait.svg" },
        { _id: "real-photo", photoUrl: "https://example.test/upload.jpg" },
        { _id: "no-photo" },
      ],
    }) }) };
    expect(await invoke({ db })).toEqual({ teamId: "team-1", teamSlug: "fc27-test", created: false });
    expect(insert).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledExactlyOnceWith("old-avatar", { photoUrl: undefined });
  });
});
