import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import {
  configureApnsDevelopment,
  validateApnsDevelopmentConfiguration,
} from "./configure-apns-dev.mjs";

function applePrivateKey() {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return privateKey.export({ type: "pkcs8", format: "pem" });
}

function validConfiguration() {
  return {
    keyId: "ABCDEFGHIJ",
    teamId: "KLMNOPQRST",
    privateKey: applePrivateKey(),
    bundleId: "com.jeugdvoetbal.app",
    environment: "sandbox",
  };
}

describe("APNs development configuration guard", () => {
  it("accepts only the isolated app's sandbox P-256 configuration", () => {
    const configuration =
      validateApnsDevelopmentConfiguration(validConfiguration());

    assert.equal(configuration.APNS_KEY_ID, "ABCDEFGHIJ");
    assert.equal(configuration.APNS_TEAM_ID, "KLMNOPQRST");
    assert.match(configuration.APNS_PRIVATE_KEY, /BEGIN PRIVATE KEY/);
    assert.equal(configuration.APNS_BUNDLE_ID, "com.jeugdvoetbal.app");
    assert.equal(configuration.APNS_ENVIRONMENT, "sandbox");
  });

  it("rejects invalid identifiers, bundle IDs, environments, and key material", () => {
    const valid = validConfiguration();
    assert.throws(
      () => validateApnsDevelopmentConfiguration({ ...valid, keyId: "short" }),
      /exactly 10/,
    );
    assert.throws(
      () =>
        validateApnsDevelopmentConfiguration({
          ...valid,
          bundleId: "com.example.other",
        }),
      /com\.jeugdvoetbal\.app/,
    );
    assert.throws(
      () =>
        validateApnsDevelopmentConfiguration({
          ...valid,
          environment: "production",
        }),
      /sandbox/,
    );
    assert.throws(
      () =>
        validateApnsDevelopmentConfiguration({
          ...valid,
          privateKey: "not a key",
        }),
      /PKCS#8/,
    );
  });

  it("guards the target and pipes every value before reading it back", () => {
    const commands = [];
    const logs = [];
    const input = validConfiguration();
    const expected = validateApnsDevelopmentConfiguration(input);
    const run = (command, args, options = {}) => {
      commands.push({ command, args, options });
      const name = args.at(-1);
      return options.capture ? expected[name] : "";
    };

    configureApnsDevelopment(input, { run, log: (line) => logs.push(line) });

    assert.deepEqual(
      [commands[0].command, ...commands[0].args],
      [process.execPath, "scripts/verify-new-app-convex-target.mjs"],
    );
    const setters = commands.slice(1, 6);
    const getters = commands.slice(6);
    assert.equal(setters.length, 5);
    assert.equal(getters.length, 5);
    for (const command of setters) {
      assert.deepEqual(command.args.slice(0, 6), [
        "convex",
        "env",
        "set",
        "--deployment",
        "brainy-buffalo-707",
        command.args.at(-1),
      ]);
      assert.equal(command.args.includes(expected[command.args.at(-1)]), false);
      assert.equal(command.options.input, `${expected[command.args.at(-1)]}\n`);
    }
    for (const command of getters) {
      assert.equal(command.args[4], "brainy-buffalo-707");
      assert.equal(command.options.capture, true);
    }
    assert.equal(logs.join("\n").includes(expected.APNS_PRIVATE_KEY), false);
  });
});
