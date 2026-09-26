import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JO13_02_DEMO_PROFILE } from "./demoProfiles";
import { getLocalJo13DemoProfile } from "./localRoster.server";

vi.mock("node:fs", () => {
  const read = vi.fn();
  return { readFileSync: read, default: { readFileSync: read } };
});
const roster = { version: 1, teamSlug: "jo13-2", importedAt: "2026-09-26T12:00:00Z", players: [{ id: "local-a", name: "Testspeler", number: 4, position: "CB" }] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(roster));
});
afterEach(() => vi.unstubAllEnvs());

describe("private local roster loader", () => {
  it("loads sanitized roster under a separate stable browser namespace", () => {
    const first = getLocalJo13DemoProfile();
    expect(first.roster?.players[0].name).toBe("Testspeler");
    expect(first.storageKey).not.toBe(JO13_02_DEMO_PROFILE.storageKey);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ ...roster, importedAt: "2026-09-27T12:00:00Z" }));
    expect(getLocalJo13DemoProfile().storageKey).toBe(first.storageKey);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ ...roster, players: [{ ...roster.players[0], name: "Andere testnaam" }] }));
    expect(getLocalJo13DemoProfile().storageKey).not.toBe(first.storageKey);
  });

  it.each([
    { NODE_ENV: "production", VERCEL: undefined, VERCEL_ENV: undefined },
    { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" },
    { NODE_ENV: "development", VERCEL: "1", VERCEL_ENV: undefined },
    { NODE_ENV: "development", VERCEL: undefined, VERCEL_ENV: "preview" },
  ])("never reads names in hosted/build environments: %j", (env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    expect(getLocalJo13DemoProfile()).toBe(JO13_02_DEMO_PROFILE);
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it.each(["{broken", JSON.stringify({ version: 9 }), "x".repeat(1_000_001)])("falls back for invalid local data", (raw) => {
    vi.mocked(readFileSync).mockReturnValue(raw);
    expect(getLocalJo13DemoProfile()).toBe(JO13_02_DEMO_PROFILE);
  });

  it("falls back when the local snapshot is unavailable", () => {
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
    expect(getLocalJo13DemoProfile()).toBe(JO13_02_DEMO_PROFILE);
  });
});
