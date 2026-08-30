import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  configureClerkDevelopment,
  frontendApiUrlFromDevelopmentPublishableKey,
  validateClerkDevelopmentConfiguration,
} from "./configure-clerk-dev.mjs";

function developmentKey(domain) {
  return `pk_test_${Buffer.from(`${domain}$`).toString("base64url")}`;
}

describe("Clerk development configuration guard", () => {
  it("derives and validates the Frontend API URL encoded by a development key", () => {
    const key = developmentKey("wanted.clerk.accounts.dev");

    assert.equal(
      frontendApiUrlFromDevelopmentPublishableKey(key),
      "https://wanted.clerk.accounts.dev"
    );
    assert.deepEqual(
      validateClerkDevelopmentConfiguration({
        publishableKey: key,
        frontendApiUrl: "https://wanted.clerk.accounts.dev/",
      }),
      {
        publishableKey: key,
        frontendApiUrl: "https://wanted.clerk.accounts.dev",
      }
    );
  });

  it("needs only the development publishable key", () => {
    const key = developmentKey("wanted.clerk.accounts.dev");

    assert.deepEqual(
      validateClerkDevelopmentConfiguration({ publishableKey: key }),
      {
        publishableKey: key,
        frontendApiUrl: "https://wanted.clerk.accounts.dev",
      }
    );
  });

  it("rejects a production key for the isolated development deployment", () => {
    assert.throws(
      () =>
        frontendApiUrlFromDevelopmentPublishableKey(
          `pk_live_${Buffer.from("live.clerk.accounts.dev$").toString("base64url")}`
        ),
      /pk_test_/
    );
  });

  it("rejects a publishable key and Frontend API URL from different Clerk apps", () => {
    assert.throws(
      () =>
        validateClerkDevelopmentConfiguration({
          publishableKey: developmentKey("first.clerk.accounts.dev"),
          frontendApiUrl: "https://second.clerk.accounts.dev",
        }),
      /Frontend API URL mismatch/
    );
  });

  it("rejects issuer URLs with paths or insecure transport", () => {
    const key = developmentKey("wanted.clerk.accounts.dev");
    assert.throws(
      () =>
        validateClerkDevelopmentConfiguration({
          publishableKey: key,
          frontendApiUrl: "http://wanted.clerk.accounts.dev/path",
        }),
      /HTTPS origin/
    );
  });

  it("guards, writes, and verifies only the confirmed development deployment", () => {
    const frontendApiUrl = "https://wanted.clerk.accounts.dev";
    const commands = [];
    const run = (command, args, options = {}) => {
      commands.push({ command, args, options });
      return options.capture ? frontendApiUrl : "";
    };

    configureClerkDevelopment(
      {
        publishableKey: developmentKey("wanted.clerk.accounts.dev"),
      },
      { run, log: () => {} }
    );

    assert.deepEqual(commands.map(({ command, args }) => [command, ...args]), [
      [process.execPath, "scripts/verify-new-app-convex-target.mjs"],
      [
        "npx",
        "convex",
        "env",
        "set",
        "--deployment",
        "brainy-buffalo-707",
        "CLERK_FRONTEND_API_URL",
        frontendApiUrl,
      ],
      [
        "npx",
        "convex",
        "env",
        "get",
        "--deployment",
        "brainy-buffalo-707",
        "CLERK_FRONTEND_API_URL",
      ],
    ]);
  });
});
