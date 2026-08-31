/**
 * Build script for Vercel + Convex deployment.
 *
 * - Production (CONVEX_DEPLOY_KEY present + VERCEL_ENV === "production"):
 *     Runs `convex deploy --cmd 'next build'` to deploy Convex functions
 *     and build Next.js in one step.
 *
 * - Preview / Development (no CONVEX_DEPLOY_KEY, or non-production env):
 *     Runs only `next build`. The Convex backend is not modified —
 *     the preview site uses the existing NEXT_PUBLIC_CONVEX_URL.
 */

import { execSync } from "node:child_process";

const deployKey = process.env.CONVEX_DEPLOY_KEY;
const vercelEnv = process.env.VERCEL_ENV; // "production" | "preview" | "development"

const isProduction = vercelEnv === "production";

// A `convex` JWT template without the email claim silently strips every
// role-gated link from the nav bar, so block the deploy instead of shipping it.
execSync(
  `node scripts/check-clerk-convex-jwt.mjs${isProduction ? " --strict" : ""}`,
  { stdio: "inherit" },
);

if (deployKey && isProduction) {
  console.log("🚀 Production build: deploying Convex functions + Next.js build");
  // CONVEX_VERBOSE=1 surfaces detailed logs if deploy hangs (e.g. "Analyzing source code...")
  const env = { ...process.env, CONVEX_VERBOSE: "1" };
  execSync("npx convex deploy --cmd \"next build\"", {
    stdio: "inherit",
    env,
  });
} else if (deployKey && !isProduction) {
  console.log(
    `⚠️  Skipping Convex deploy for ${vercelEnv ?? "local"} environment.`,
  );
  console.log("   Running Next.js build only (using existing Convex URL).");
  execSync("npx next build", { stdio: "inherit" });
} else {
  console.log("📦 No CONVEX_DEPLOY_KEY found — running Next.js build only.");
  execSync("npx next build", { stdio: "inherit" });
}
