#!/usr/bin/env node
/**
 * Creates or repairs the Clerk JWT template named `convex` so that Convex
 * receives the email claim it needs to resolve roles. Never prints secrets.
 */
import {
  clerkRequest,
  fetchConvexTemplate,
  resolveClerkSecret,
  summarizeTemplate,
  TEMPLATE_PAYLOAD,
} from "./lib/clerkJwt.mjs";

const secret = resolveClerkSecret();
if (!secret) {
  console.error("CLERK_SECRET_KEY not found in environment or .env.local");
  process.exit(1);
}

const { templates, template } = await fetchConvexTemplate(secret);
console.log(
  "existing_templates",
  templates.map((entry) => entry.name),
);

if (template) {
  const updated = await clerkRequest(
    secret,
    `/jwt_templates/${template.id}`,
    "PATCH",
    TEMPLATE_PAYLOAD,
  );
  console.log("updated", summarizeTemplate(updated));
} else {
  const created = await clerkRequest(
    secret,
    "/jwt_templates",
    "POST",
    TEMPLATE_PAYLOAD,
  );
  console.log("created", summarizeTemplate(created));
}
