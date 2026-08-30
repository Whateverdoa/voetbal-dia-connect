import { createPrivateKey } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = new URL("../", import.meta.url);
const target = JSON.parse(
  readFileSync(
    new URL("config/new-app-convex-target.json", repositoryRoot),
    "utf8",
  ),
);
const expectedBundleId = "com.jeugdvoetbal.app";
const variableNames = [
  "APNS_KEY_ID",
  "APNS_TEAM_ID",
  "APNS_PRIVATE_KEY",
  "APNS_BUNDLE_ID",
  "APNS_ENVIRONMENT",
];

function normalizedPrivateKey(rawValue) {
  const value = rawValue?.trim().replace(/\\n/g, "\n");
  if (!value) throw new Error("APNS_PRIVATE_KEY is required");
  if (
    !value.startsWith("-----BEGIN PRIVATE KEY-----\n") ||
    !value.endsWith("\n-----END PRIVATE KEY-----")
  ) {
    throw new Error("APNS_PRIVATE_KEY must contain a valid PKCS#8 private key");
  }

  let key;
  try {
    key = createPrivateKey(value);
  } catch {
    throw new Error("APNS_PRIVATE_KEY must contain a valid PKCS#8 private key");
  }
  if (
    key.asymmetricKeyType !== "ec" ||
    key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  ) {
    throw new Error("APNS_PRIVATE_KEY must be an Apple-compatible P-256 key");
  }
  return `${value}\n`;
}

function appleIdentifier(name, rawValue) {
  const value = rawValue?.trim();
  if (!/^[A-Z0-9]{10}$/.test(value ?? "")) {
    throw new Error(
      `${name} must contain exactly 10 uppercase letters or digits`,
    );
  }
  return value;
}

export function validateApnsDevelopmentConfiguration({
  keyId,
  teamId,
  privateKey,
  bundleId,
  environment,
}) {
  const normalizedKeyId = appleIdentifier("APNS_KEY_ID", keyId);
  const normalizedTeamId = appleIdentifier("APNS_TEAM_ID", teamId);
  const validatedPrivateKey = normalizedPrivateKey(privateKey);
  const normalizedBundleId = bundleId?.trim();
  if (normalizedBundleId !== expectedBundleId) {
    throw new Error(`APNS_BUNDLE_ID must be ${expectedBundleId}`);
  }
  if (environment?.trim() !== "sandbox") {
    throw new Error(
      "APNS_ENVIRONMENT must be sandbox for the development deployment",
    );
  }

  return {
    APNS_KEY_ID: normalizedKeyId,
    APNS_TEAM_ID: normalizedTeamId,
    APNS_PRIVATE_KEY: validatedPrivateKey,
    APNS_BUNDLE_ID: normalizedBundleId,
    APNS_ENVIRONMENT: "sandbox",
  };
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: fileURLToPath(repositoryRoot),
    encoding: "utf8",
    input: options.input,
    stdio: options.capture
      ? [options.input === undefined ? "ignore" : "pipe", "pipe", "inherit"]
      : [
          options.input === undefined ? "inherit" : "pipe",
          "inherit",
          "inherit",
        ],
  });
}

function privateKeyFromEnvironment(environment) {
  const inlineKey = environment.APNS_PRIVATE_KEY?.trim();
  const keyFile = environment.APNS_PRIVATE_KEY_FILE?.trim();
  if (inlineKey && keyFile) {
    throw new Error("Set APNS_PRIVATE_KEY or APNS_PRIVATE_KEY_FILE, not both");
  }
  if (keyFile) {
    if (!existsSync(keyFile)) {
      throw new Error("APNS_PRIVATE_KEY_FILE does not exist");
    }
    return readFileSync(keyFile, "utf8");
  }
  return inlineKey;
}

export function configureApnsDevelopment(
  {
    keyId = process.env.APNS_KEY_ID,
    teamId = process.env.APNS_TEAM_ID,
    privateKey = privateKeyFromEnvironment(process.env),
    bundleId = process.env.APNS_BUNDLE_ID,
    environment = process.env.APNS_ENVIRONMENT,
  } = {},
  dependencies = {},
) {
  const execute = dependencies.run ?? run;
  const log = dependencies.log ?? console.log;
  const configuration = validateApnsDevelopmentConfiguration({
    keyId,
    teamId,
    privateKey,
    bundleId,
    environment,
  });

  execute(process.execPath, ["scripts/verify-new-app-convex-target.mjs"]);
  for (const name of variableNames) {
    execute(
      "npx",
      [
        "convex",
        "env",
        "set",
        "--deployment",
        target.developmentDeployment,
        name,
      ],
      { input: `${configuration[name]}\n` },
    );
  }
  for (const name of variableNames) {
    const configuredValue = execute(
      "npx",
      [
        "convex",
        "env",
        "get",
        "--deployment",
        target.developmentDeployment,
        name,
      ],
      { capture: true },
    ).trim();
    if (configuredValue !== configuration[name].trim()) {
      throw new Error(
        `Convex returned a different ${name} after configuration`,
      );
    }
  }

  log(
    `Configured and verified ${variableNames.join(", ")} on isolated development deployment ${target.developmentDeployment}.`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    configureApnsDevelopment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
