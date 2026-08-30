import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateNewAppWebTarget } from "./verify-new-app-web-target.mjs";

function developmentKey(host = "wanted.clerk.accounts.dev") {
  return `pk_test_${Buffer.from(`${host}$`).toString("base64url")}`;
}

function validEnvironment() {
  return {
    JEUGDVOETBAL_APPLE_ENVIRONMENT: "development",
    JEUGDVOETBAL_CONVEX_TEAM: "mike-ten-hoonte",
    JEUGDVOETBAL_CONVEX_PROJECT: "jeugdvoetbal-apple-dev",
    NEXT_PUBLIC_CONVEX_URL: "https://brainy-buffalo-707.eu-west-1.convex.cloud",
    NEXT_PUBLIC_CONVEX_SITE_URL:
      "https://brainy-buffalo-707.eu-west-1.convex.site",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: developmentKey(),
    CLERK_SECRET_KEY: "sk_test_private",
    VERCEL_ENV: "preview",
  };
}

describe("new Apple web target guard", () => {
  it("accepts only the isolated development target", () => {
    assert.deepEqual(validateNewAppWebTarget(validEnvironment()), {
      deployment: "brainy-buffalo-707",
      cloudUrl: "https://brainy-buffalo-707.eu-west-1.convex.cloud",
      siteUrl: "https://brainy-buffalo-707.eu-west-1.convex.site",
    });
  });

  it("rejects the wrong Convex deployment and unknown Vercel environments", () => {
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          NEXT_PUBLIC_CONVEX_URL: "https://protected-live.convex.cloud",
        }),
      /brainy-buffalo-707/,
    );
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          VERCEL_ENV: "staging",
        }),
      /VERCEL_ENV/,
    );
  });

  it("requires development Clerk keys without exposing their values", () => {
    const missingSecret = { ...validEnvironment() };
    delete missingSecret.CLERK_SECRET_KEY;
    assert.throws(
      () => validateNewAppWebTarget(missingSecret),
      /^Error: CLERK_SECRET_KEY is required/,
    );
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: developmentKey().replace(
            "pk_test_",
            "pk_live_",
          ),
        }),
      /development publishable key/,
    );
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          CLERK_SECRET_KEY: "sk_live_private",
        }),
      /development secret/,
    );
  });

  it("rejects deploy and Sportlink credentials", () => {
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          CONVEX_DEPLOY_KEY: "dev:secret",
        }),
      /CONVEX_DEPLOY_KEY/,
    );
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          SPORTLINK_CLIENT_ID: "secret",
        }),
      /SPORTLINK_CLIENT_ID/,
    );
    assert.throws(
      () =>
        validateNewAppWebTarget({
          ...validEnvironment(),
          CONVEX_DEPLOYMENT: "prod:protected-live",
        }),
      /dev:brainy-buffalo-707/,
    );
  });
});
