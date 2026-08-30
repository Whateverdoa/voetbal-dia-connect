import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = new URL("../", import.meta.url);
const target = JSON.parse(
  readFileSync(new URL("config/new-app-convex-target.json", repositoryRoot), "utf8")
);

function normalizeFrontendApiUrl(rawValue) {
  const value = rawValue?.trim();
  if (!value) throw new Error("CLERK_FRONTEND_API_URL is required");

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CLERK_FRONTEND_API_URL must be a valid HTTPS URL");
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
    throw new Error("CLERK_FRONTEND_API_URL must be an HTTPS origin without a path");
  }
  return url.origin;
}

export function frontendApiUrlFromDevelopmentPublishableKey(publishableKey) {
  const value = publishableKey?.trim();
  if (!value?.startsWith("pk_test_")) {
    throw new Error("A Clerk development publishable key starting with pk_test_ is required");
  }

  const encodedDomain = value.slice("pk_test_".length);
  if (!encodedDomain) throw new Error("The Clerk publishable key is incomplete");

  const decodedDomain = Buffer.from(encodedDomain, "base64url")
    .toString("utf8")
    .replace(/\$+$/, "");
  return normalizeFrontendApiUrl(
    decodedDomain.startsWith("https://")
      ? decodedDomain
      : `https://${decodedDomain}`
  );
}

export function validateClerkDevelopmentConfiguration({
  publishableKey,
  frontendApiUrl,
}) {
  const keyFrontendApiUrl = frontendApiUrlFromDevelopmentPublishableKey(publishableKey);
  const normalizedFrontendApiUrl = frontendApiUrl?.trim()
    ? normalizeFrontendApiUrl(frontendApiUrl)
    : keyFrontendApiUrl;
  if (normalizedFrontendApiUrl !== keyFrontendApiUrl) {
    throw new Error(
      `Clerk Frontend API URL mismatch: publishable key belongs to ${keyFrontendApiUrl}, received ${normalizedFrontendApiUrl}`
    );
  }
  return {
    publishableKey: publishableKey.trim(),
    frontendApiUrl: normalizedFrontendApiUrl,
  };
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
  frontendApiUrl =
    process.env.CLERK_FRONTEND_API_URL ?? process.env.CLERK_JWT_ISSUER_DOMAIN,
} = {}, dependencies = {}) {
  const execute = dependencies.run ?? run;
  const log = dependencies.log ?? console.log;
  const configuration = validateClerkDevelopmentConfiguration({
    publishableKey,
    frontendApiUrl,
  });

  execute(process.execPath, ["scripts/verify-new-app-convex-target.mjs"]);
  execute("npx", [
    "convex",
    "env",
    "set",
    "--deployment",
    target.developmentDeployment,
    "CLERK_FRONTEND_API_URL",
    configuration.frontendApiUrl,
  ]);
  const configuredFrontendApiUrl = execute(
    "npx",
    [
      "convex",
      "env",
      "get",
      "--deployment",
      target.developmentDeployment,
      "CLERK_FRONTEND_API_URL",
    ],
    { capture: true }
  ).trim();
  if (configuredFrontendApiUrl !== configuration.frontendApiUrl) {
    throw new Error("Convex returned a different Clerk Frontend API URL after configuration");
  }

  log(
    `Configured Clerk Frontend API URL on isolated development deployment ${target.developmentDeployment}.`
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
