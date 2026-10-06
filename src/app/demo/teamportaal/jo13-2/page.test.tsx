import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamPortalDemo } from "@/components/team-portal/TeamPortalDemo";
import { JO13_02_DEMO_PROFILE, type DemoProfile } from "@/lib/team-portal/demoProfiles";
import Jo13TeamPortalPilotPage, { dynamic, metadata, viewport } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("PILOT_NOT_FOUND"); },
}));
vi.mock("@/lib/team-portal/localRoster.server", () => ({
  getLocalJo13DemoProfile: () => JO13_02_DEMO_PROFILE,
}));
vi.mock("@/components/team-portal/TeamPortalDemo", () => ({
  TeamPortalDemo: vi.fn(({ profile }: { profile: DemoProfile }) => <main>{profile.teamName} proefversie</main>),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("JO13-02 pilot server page", () => {
  it("serves the local pilot with the isolated JO13-02 profile passed to the shared UI", () => {
    render(Jo13TeamPortalPilotPage());

    expect(screen.getByText("DIA JO13-02 proefversie")).toBeInTheDocument();
    expect(vi.mocked(TeamPortalDemo).mock.calls[0][0].profile).toBe(JO13_02_DEMO_PROFILE);
    expect(vi.mocked(TeamPortalDemo).mock.calls[0][0].profile).toMatchObject({
      teamSlug: "jo13-2", pilot: true, storageKey: "dia-teamportaal-demo-jo13-2-2026-2027-v1",
    });
  });

  it("returns not found in production even when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");

    expect(() => Jo13TeamPortalPilotPage()).toThrow("PILOT_NOT_FOUND");
    expect(TeamPortalDemo).not.toHaveBeenCalled();
  });

  it("requires preview opt-in on each request and preserves the pilot profile", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(() => Jo13TeamPortalPilotPage()).toThrow("PILOT_NOT_FOUND");

    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    render(Jo13TeamPortalPilotPage());
    expect(screen.getByText("DIA JO13-02 proefversie")).toBeInTheDocument();
    expect(vi.mocked(TeamPortalDemo).mock.calls[0][0].profile).toBe(JO13_02_DEMO_PROFILE);

    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "false");
    expect(() => Jo13TeamPortalPilotPage()).toThrow("PILOT_NOT_FOUND");
  });

  it("does not treat an unidentified hosted environment as local development", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    expect(() => Jo13TeamPortalPilotPage()).toThrow("PILOT_NOT_FOUND");
    expect(TeamPortalDemo).not.toHaveBeenCalled();
  });

  it("keeps the request-time gate, noindex metadata and accessible zoom settings", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toContain("JO13-02");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(viewport.userScalable).toBe(true);
    expect(viewport.maximumScale).toBeGreaterThan(1);
  });
});
