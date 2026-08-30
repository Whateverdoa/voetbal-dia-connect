import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = new URL("../", import.meta.url);
const target = JSON.parse(
  readFileSync(new URL("config/new-app-convex-target.json", repositoryRoot), "utf8")
);

function normalizeIssuer(rawValue) {
  const value = rawValue?.trim();
  if (!value) throw new Error("CLERK_JWT_ISSUER_DOMAIN is required");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN must be a valid HTTPS URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN must be an HTTPS origin without a path");
  }
  return url.origin;
}

export function issuerFromDevelopmentPublishableKey(publishableKey) {
  const value = publishableKey?.trim();
  if (!value?.startsWith("pk_test_")) {
    throw new Error("A Clerk development publishable key starting with pk_test_ is required");
  }

  const encodedDomain = value.slice("pk_test_".length);
  if (!encodedDomain) throw new Error("The Clerk publishable key is incomplete");

  const decodedDomain = Buffer.from(encodedDomain, "base64url")
    .toString("utf8")
    .replace(/\$+$/, "");
  return normalizeIssuer(
    decodedDomain.startsWith("https://")
      ? decodedDomain
      : `https://${decodedDomain}`
  );
}

export function validateClerkDevelopmentConfiguration({
  publishableKey,
  issuer,
}) {
  const keyIssuer = issuerFromDevelopmentPublishableKey(publishableKey);
  const normalizedIssuer = issuer?.trim() ? normalizeIssuer(issuer) : keyIssuer;
  if (normalizedIssuer !== keyIssuer) {
    throw new Error(
      `Clerk issuer mismatch: publishable key belongs to ${keyIssuer}, received ${normalizedIssuer}`
    );
  }
  return { publishableKey: publishableKey.trim(), issuer: normalizedIssuer };
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: fileURLToPath(repositoryRoot),
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

export function configureClerkDevelopment({
  publishableKey = process.env.JEUGDVOETBAL_CLERK_PUBLISHABLE_KEY,
  issuer = process.env.CLERK_JWT_ISSUER_DOMAIN,
} = {}, dependencies = {}) {
  const execute = dependencies.run ?? run;
  const log = dependencies.log ?? console.log;
  const configuration = validateClerkDevelopmentConfiguration({
    publishableKey,
    issuer,
  });

  execute(process.execPath, ["scripts/verify-new-app-convex-target.mjs"]);
  execute("npx", [
    "convex",
    "env",
    "set",
    "--deployment",
    target.developmentDeployment,
    "CLERK_JWT_ISSUER_DOMAIN",
    configuration.issuer,
  ]);
  const configuredIssuer = execute(
    "npx",
    [
      "convex",
      "env",
      "get",
      "--deployment",
      target.developmentDeployment,
      "CLERK_JWT_ISSUER_DOMAIN",
    ],
    { capture: true }
  ).trim();
  if (configuredIssuer !== configuration.issuer) {
    throw new Error("Convex returned a different Clerk issuer after configuration");
  }

  log(
    `Configured Clerk issuer on isolated development deployment ${target.developmentDeployment}.`
  );
  log(
    "Use JEUGDVOETBAL_CLERK_PUBLISHABLE_KEY for the Apple build; it was not written to Git."
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    configureClerkDevelopment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
