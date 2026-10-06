import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeamPortalDemoPage, { metadata, viewport } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("DEMO_NOT_FOUND"); },
}));
vi.mock("@/components/team-portal/TeamPortalDemo", () => ({
  TeamPortalDemo: () => <main>Fictief teamportaal</main>,
}));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("team portal demo server page", () => {
  it("serves local development without credentials", () => {
    render(TeamPortalDemoPage());
    expect(screen.getByText("Fictief teamportaal")).toBeInTheDocument();
  });

  it("returns not found in production even with the demo flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    expect(() => TeamPortalDemoPage()).toThrow("DEMO_NOT_FOUND");
  });

  it("requires explicit preview opt-in at request time", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(() => TeamPortalDemoPage()).toThrow("DEMO_NOT_FOUND");

    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    render(TeamPortalDemoPage());
    expect(screen.getByText("Fictief teamportaal")).toBeInTheDocument();
  });

  it("excludes the demo from indexing and overrides the pitch-side zoom lock", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(viewport.userScalable).toBe(true);
    expect(viewport.maximumScale).toBeGreaterThan(1);
  });
});
