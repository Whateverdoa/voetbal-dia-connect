import { describe, expect, it } from "vitest";
import { authPageUrl, teamPortalReturnTo } from "./returnTo";

describe("team portal auth return destinations", () => {
  it("preserves a local team invitation through login and registration", () => {
    const target = "/team/jo13-1/app/invite/secret-token";
    expect(teamPortalReturnTo(target)).toBe(target);
    expect(authPageUrl("sign-up", target)).toBe(`/sign-up?returnTo=${encodeURIComponent(target)}`);
  });

  it.each([
    "https://evil.example/team/jo13-1/app", "//evil.example/team/jo13-1/app",
    "/team/jo13-1/app/../../admin", "/team/jo13-1/app/%2e%2e/admin",
    "/team/jo13-1%2fapp/app", "/team/a\\evil/app", "/team/a%5cevil/app",
    "/team/a/app%0a", "/coach", "/admin", "/onboarding/rol", null, ["/team/a/app"],
  ])("rejects external, malformed or staff destinations: %s", (value) => {
    expect(teamPortalReturnTo(value)).toBeNull();
  });

  it("retains local portal query strings and rejects unknown subroutes", () => {
    expect(teamPortalReturnTo("/team/jo13-1/app?tab=vote")).toBe("/team/jo13-1/app?tab=vote");
    expect(teamPortalReturnTo("/team/jo13-1/app/admin")).toBeNull();
  });
});
