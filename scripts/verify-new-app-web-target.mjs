import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { issuerFromDevelopmentPublishableKey } from "./configure-clerk-dev.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const target = JSON.parse(
  readFileSync(
    new URL("config/new-app-convex-target.json", repositoryRoot),
    "utf8",
  ),
);

function requiredValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value)
    throw new Error(`${name} is required for the Apple development web target`);
  return value;
}

export function validateNewAppWebTarget(environment = process.env) {
  if (
    requiredValue(environment, "JEUGDVOETBAL_APPLE_ENVIRONMENT") !==
    "development"
  ) {
    throw new Error("JEUGDVOETBAL_APPLE_ENVIRONMENT must be development");
  }
  if (requiredValue(environment, "JEUGDVOETBAL_CONVEX_TEAM") !== target.team) {
    throw new Error(`JEUGDVOETBAL_CONVEX_TEAM must be ${target.team}`);
  }
  if (
    requiredValue(environment, "JEUGDVOETBAL_CONVEX_PROJECT") !== target.project
  ) {
    throw new Error(`JEUGDVOETBAL_CONVEX_PROJECT must be ${target.project}`);
  }
  if (
    requiredValue(environment, "NEXT_PUBLIC_CONVEX_URL") !== target.cloudUrl
  ) {
    throw new Error(`NEXT_PUBLIC_CONVEX_URL must be ${target.cloudUrl}`);
  }
  if (
    requiredValue(environment, "NEXT_PUBLIC_CONVEX_SITE_URL") !== target.siteUrl
  ) {
    throw new Error(`NEXT_PUBLIC_CONVEX_SITE_URL must be ${target.siteUrl}`);
  }

  const publishableKey = requiredValue(
    environment,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  issuerFromDevelopmentPublishableKey(publishableKey);
  const secretKey = requiredValue(environment, "CLERK_SECRET_KEY");
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("CLERK_SECRET_KEY must be a Clerk development secret");
  }

  const vercelEnvironment = environment.VERCEL_ENV?.trim();
  if (
    vercelEnvironment &&
    !["preview", "development", "production"].includes(vercelEnvironment)
  ) {
    throw new Error(
      "VERCEL_ENV must be development, preview, or production when present",
    );
  }
  const convexDeployment = environment.CONVEX_DEPLOYMENT?.trim();
  if (
    convexDeployment &&
    convexDeployment !== `dev:${target.developmentDeployment}`
  ) {
    throw new Error(
      `CONVEX_DEPLOYMENT must be dev:${target.developmentDeployment} when present`,
    );
  }
  if (environment.CONVEX_DEPLOY_KEY?.trim()) {
    throw new Error(
      "CONVEX_DEPLOY_KEY must not be present on the Apple development web target",
    );
  }
  if (environment.SPORTLINK_CLIENT_ID?.trim()) {
    throw new Error(
      "SPORTLINK_CLIENT_ID must not be present on the Apple development web target",
    );
  }

  return {
    deployment: target.developmentDeployment,
    cloudUrl: target.cloudUrl,
    siteUrl: target.siteUrl,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const envFileIndex = process.argv.indexOf("--env-file");
    const envFile =
      envFileIndex >= 0 ? process.argv[envFileIndex + 1] : ".env.local";
    if (envFile && existsSync(envFile)) loadEnvFile(envFile);
    const verified = validateNewAppWebTarget();
    console.log(
      `Verified isolated Apple web target ${target.team}/${target.project}/${verified.deployment}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
