import { describe, expect, it } from "vitest";
import { isFrozenJo132Slug } from "./protectedTeams";

describe("isFrozenJo132Slug", () => {
  it("freezes JO13-2 variants", () => {
    expect(isFrozenJo132Slug("jo13-2")).toBe(true);
    expect(isFrozenJo132Slug("JO13-02")).toBe(true);
    expect(isFrozenJo132Slug("JO13-2JM")).toBe(true);
    expect(isFrozenJo132Slug("o13-2jm")).toBe(true);
  });

  it("leaves other youth teams writable", () => {
    expect(isFrozenJo132Slug("jo13-1")).toBe(false);
    expect(isFrozenJo132Slug("jo13-3")).toBe(false);
    expect(isFrozenJo132Slug("jo15-1")).toBe(false);
  });
});
