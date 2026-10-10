import { describe, expect, it } from "vitest";
import type { UserIdentity } from "convex/server";
import { emailFromIdentity } from "./identityEmail";

function identity(overrides: Record<string, unknown>): UserIdentity {
  return {
    email: "",
    subject: "user_1",
    issuer: "https://example.clerk.accounts.dev",
    tokenIdentifier: "https://example.clerk.accounts.dev|user_1",
    ...overrides,
  } as UserIdentity;
}

describe("emailFromIdentity", () => {
  it("reads identity.email", () => {
    expect(emailFromIdentity(identity({ email: "Coach@Dia.local" }))).toBe(
      "coach@dia.local",
    );
  });

  it("scans other string claims when email is missing", () => {
    expect(
      emailFromIdentity(identity({ nickname: "mjtenhoonte@gmail.com" })),
    ).toBe("mjtenhoonte@gmail.com");
  });

  it("ignores http values and returns null without an email", () => {
    expect(
      emailFromIdentity(identity({ picture: "https://img.clerk.com/foo" })),
    ).toBeNull();
  });
});
