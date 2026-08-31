#!/usr/bin/env node
/**
 * Guard against an empty navigation bar: when Clerk's `convex` JWT template
 * loses its email claim, Convex cannot resolve roles and every role-gated link
 * disappears. Clerk is shared with other apps, so this can change outside
 * this repository.
 *
 * Failure modes are split on purpose. A wrong template, or credentials Clerk
 * rejects, fails the run. A Clerk outage or a network error only warns, so a
 * hiccup at their end cannot block a deploy. Pass --strict to also require the
 * secret to be present.
 *
 * Sets process.exitCode instead of calling process.exit: exiting while a fetch
 * socket is still open trips a libuv assertion on Windows.
 */
import {
  fetchConvexTemplate,
  inspectTemplate,
  resolveClerkSecret,
  summarizeTemplate,
  TEMPLATE_NAME,
} from "./lib/clerkJwt.mjs";

const LABEL = "Clerk JWT template guard";
const REJECTED_STATUSES = new Set([401, 403]);

async function main() {
  const strict = process.argv.includes("--strict");

  const secret = resolveClerkSecret();
  if (!secret) {
    const reason = "CLERK_SECRET_KEY not found in environment or .env.local";
    if (strict) {
      console.error(`${LABEL} failed: ${reason}`);
      return 1;
    }
    console.warn(`${LABEL} skipped: ${reason}`);
    return 0;
  }

  let template = null;
  try {
    ({ template } = await fetchConvexTemplate(secret));
  } catch (error) {
    if (REJECTED_STATUSES.has(error.status)) {
      console.error(`${LABEL} failed: Clerk rejected the request (${error.message})`);
      console.error("The secret is probably wrong, revoked or from another instance.");
      return 1;
    }
    console.warn(`${LABEL} skipped: Clerk unreachable (${error.message})`);
    return 0;
  }

  const { ok, problems } = inspectTemplate(template);
  if (!ok) {
    console.error(`${LABEL} failed for template "${TEMPLATE_NAME}":`);
    for (const problem of problems) console.error(`- ${problem}`);
    console.error("Fix with: node scripts/ensure-clerk-convex-jwt.mjs");
    return 1;
  }

  console.log(`${LABEL} passed:`, summarizeTemplate(template));
  return 0;
}

process.exitCode = await main();
