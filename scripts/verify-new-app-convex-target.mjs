import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

const envFileIndex = process.argv.indexOf("--env-file");
const envFile =
  envFileIndex >= 0 ? process.argv[envFileIndex + 1] : ".env.local";
if (!envFile || !existsSync(envFile)) {
  throw new Error(
    `New-app Convex env file not found: ${envFile ?? "<missing>"}`,
  );
}

loadEnvFile(envFile);
const target = JSON.parse(
  readFileSync(
    new URL("../config/new-app-convex-target.json", import.meta.url),
    "utf8",
  ),
);
const deployment = process.env.CONVEX_DEPLOYMENT?.trim();
if (!deployment) {
  throw new Error("CONVEX_DEPLOYMENT is missing");
}

const separator = deployment.indexOf(":");
const deploymentKind = separator >= 0 ? deployment.slice(0, separator) : "";
if (!target.allowedDeploymentKinds.includes(deploymentKind)) {
  throw new Error(
    `Refusing Convex deployment kind '${deploymentKind || "unknown"}'; expected local or dev`,
  );
}

const normalized = deployment.toLowerCase().replaceAll("_", "-");
if (normalized.includes("voetbal-dia-connect")) {
  throw new Error("Refusing the protected voetbal-dia-connect deployment");
}

if (deploymentKind === "local") {
  const expectedTeam = target.team.toLowerCase();
  const expectedProject = target.project.toLowerCase();
  if (
    !normalized.includes(expectedTeam) ||
    !normalized.includes(expectedProject)
  ) {
    throw new Error(
      `Local deployment must belong to ${target.team}/${target.project}; received ${deployment}`,
    );
  }
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl?.startsWith("http://127.0.0.1:")) {
    throw new Error("Local deployment must use a 127.0.0.1 Convex URL");
  }
} else {
  const expectedDeployment = `dev:${target.developmentDeployment}`;
  if (deployment !== expectedDeployment) {
    throw new Error(
      `Cloud dev target must be ${expectedDeployment}; received ${deployment}`,
    );
  }
  const configuredTeam = process.env.JEUGDVOETBAL_CONVEX_TEAM?.trim();
  const configuredProject = process.env.JEUGDVOETBAL_CONVEX_PROJECT?.trim();
  if (configuredTeam !== target.team || configuredProject !== target.project) {
    throw new Error(
      "Cloud dev targets require exact JEUGDVOETBAL_CONVEX_TEAM and JEUGDVOETBAL_CONVEX_PROJECT markers",
    );
  }
  if (process.env.NEXT_PUBLIC_CONVEX_URL?.trim() !== target.cloudUrl) {
    throw new Error(`Cloud dev target must use ${target.cloudUrl}`);
  }
  if (process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() !== target.siteUrl) {
    throw new Error(`Cloud dev target must use ${target.siteUrl}`);
  }
}

if (process.env.SPORTLINK_CLIENT_ID?.trim()) {
  throw new Error(
    "SPORTLINK_CLIENT_ID must not be present in the new-app development env",
  );
}

console.log(
  `Verified isolated Convex target ${target.team}/${target.project}/${target.developmentDeployment} (${deploymentKind})`,
);
