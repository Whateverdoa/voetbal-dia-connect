import { describe, expect, it } from "vitest";
import { isTeamPortalDemoEnabled, isTeamPortalDemoPath } from "./demoRoute";

describe("team portal demo route", () => {
  it.each(["/demo/teamportaal", "/demo/teamportaal/", "/demo/teamportaal/speler"])(
    "isolates %s",
    (pathname) => expect(isTeamPortalDemoPath(pathname)).toBe(true)
  );

  it.each(["/", "/coach", "/demo", "/demo/teamportaal-extra", "/team/jo13-2"])(
    "keeps %s in the connected app",
    (pathname) => expect(isTeamPortalDemoPath(pathname)).toBe(false)
  );
});

describe("team portal demo availability", () => {
  it("allows local development without configuring a backend", () => {
    expect(isTeamPortalDemoEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("requires explicit opt-in for a production-built preview", () => {
    const preview = { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" };
    expect(isTeamPortalDemoEnabled(preview)).toBe(false);
    expect(isTeamPortalDemoEnabled({ ...preview, TEAM_PORTAL_DEMO_ENABLED: "false" })).toBe(false);
    expect(isTeamPortalDemoEnabled({ ...preview, TEAM_PORTAL_DEMO_ENABLED: "true" })).toBe(true);
  });

  it("cannot be enabled on a production deployment", () => {
    expect(isTeamPortalDemoEnabled({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      TEAM_PORTAL_DEMO_ENABLED: "true",
    })).toBe(false);
    expect(isTeamPortalDemoEnabled({
      NODE_ENV: "development",
      VERCEL_ENV: "production",
      TEAM_PORTAL_DEMO_ENABLED: "true",
    })).toBe(false);
  });

  it("fails closed for production builds and unknown deployment environments", () => {
    expect(isTeamPortalDemoEnabled({})).toBe(false);
    expect(isTeamPortalDemoEnabled({ NODE_ENV: "production", TEAM_PORTAL_DEMO_ENABLED: "true" })).toBe(false);
    expect(isTeamPortalDemoEnabled({ NODE_ENV: "development", VERCEL: "1" })).toBe(false);
    expect(isTeamPortalDemoEnabled({ NODE_ENV: "development", VERCEL_ENV: "staging" })).toBe(false);
  });
});
