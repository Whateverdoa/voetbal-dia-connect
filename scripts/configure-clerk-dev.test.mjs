import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  configureClerkDevelopment,
  issuerFromDevelopmentPublishableKey,
  validateClerkDevelopmentConfiguration,
} from "./configure-clerk-dev.mjs";

function developmentKey(domain) {
  return `pk_test_${Buffer.from(`${domain}$`).toString("base64url")}`;
}

describe("Clerk development configuration guard", () => {
  it("derives and validates the issuer encoded by a development key", () => {
    const key = developmentKey("wanted.clerk.accounts.dev");

    assert.equal(
      issuerFromDevelopmentPublishableKey(key),
      "https://wanted.clerk.accounts.dev"
    );
    assert.deepEqual(
      validateClerkDevelopmentConfiguration({
        publishableKey: key,
        issuer: "https://wanted.clerk.accounts.dev/",
      }),
      {
        publishableKey: key,
        issuer: "https://wanted.clerk.accounts.dev",
      }
    );
  });

  it("rejects a production key for the isolated development deployment", () => {
    assert.throws(
      () =>
        issuerFromDevelopmentPublishableKey(
          `pk_live_${Buffer.from("live.clerk.accounts.dev$").toString("base64url")}`
        ),
      /pk_test_/
    );
  });

  it("rejects a publishable key and issuer from different Clerk apps", () => {
    assert.throws(
      () =>
        validateClerkDevelopmentConfiguration({
          publishableKey: developmentKey("first.clerk.accounts.dev"),
          issuer: "https://second.clerk.accounts.dev",
        }),
      /issuer mismatch/
    );
  });

  it("rejects issuer URLs with paths or insecure transport", () => {
    const key = developmentKey("wanted.clerk.accounts.dev");
    assert.throws(
      () =>
        validateClerkDevelopmentConfiguration({
          publishableKey: key,
          issuer: "http://wanted.clerk.accounts.dev/path",
        }),
      /HTTPS origin/
    );
  });

  it("guards, writes, and verifies only the confirmed development deployment", () => {
    const issuer = "https://wanted.clerk.accounts.dev";
    const commands = [];
    const run = (command, args, options = {}) => {
      commands.push({ command, args, options });
      return options.capture ? issuer : "";
    };

    configureClerkDevelopment(
      {
        publishableKey: developmentKey("wanted.clerk.accounts.dev"),
        issuer,
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
        "CLERK_JWT_ISSUER_DOMAIN",
        issuer,
      ],
      [
        "npx",
        "convex",
        "env",
        "get",
        "--deployment",
        "brainy-buffalo-707",
        "CLERK_JWT_ISSUER_DOMAIN",
      ],
    ]);
  });
});
