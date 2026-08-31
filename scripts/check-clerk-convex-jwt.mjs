#!/usr/bin/env node
/**
 * Guard against an empty navigation bar: when Clerk's `convex` JWT template
 * loses its email claim, Convex cannot resolve roles and every role-gated link
 * disappears. Clerk is shared with other apps, so this can change outside
 * this repository.
 *
 * Unreachable Clerk or a missing secret is a warning, never a build blocker;
 * only a template that is present-but-wrong fails the run. Pass --strict to
 * also require the secret.
 */
import {
  fetchConvexTemplate,
  inspectTemplate,
  resolveClerkSecret,
  summarizeTemplate,
  TEMPLATE_NAME,
} from "./lib/clerkJwt.mjs";

const LABEL = "Clerk JWT template guard";
const strict = process.argv.includes("--strict");

const secret = resolveClerkSecret();
if (!secret) {
  const reason = "CLERK_SECRET_KEY not found in environment or .env.local";
  if (strict) {
    console.error(`${LABEL} failed: ${reason}`);
    process.exit(1);
  }
  console.warn(`${LABEL} skipped: ${reason}`);
  process.exit(0);
}

let template = null;
try {
  ({ template } = await fetchConvexTemplate(secret));
} catch (error) {
  console.warn(`${LABEL} skipped: Clerk unreachable (${error.message})`);
  process.exit(0);
}

const { ok, problems } = inspectTemplate(template);
if (!ok) {
  console.error(`${LABEL} failed for template "${TEMPLATE_NAME}":`);
  for (const problem of problems) console.error(`- ${problem}`);
  console.error("Fix with: node scripts/ensure-clerk-convex-jwt.mjs");
  process.exit(1);
}

console.log(`${LABEL} passed:`, summarizeTemplate(template));
