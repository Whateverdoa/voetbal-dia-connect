/**
 * Ensures Clerk has a JWT template named `convex` with aud + email claims.
 * Reads CLERK_SECRET_KEY from .env.local. Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[trimmed.slice(0, eq).trim()] = value;
}

const secret = env.CLERK_SECRET_KEY;
if (!secret) {
  console.error("CLERK_SECRET_KEY ontbreekt in .env.local");
  process.exit(1);
}

const CLAIMS = {
  aud: "convex",
  email: "{{user.primary_email_address}}",
  name: "{{user.full_name}}",
  picture: "{{user.image_url}}",
};

async function clerk(pathname, method = "GET", body) {
  const response = await fetch(`https://api.clerk.com/v1${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!response.ok) {
    const err = new Error(`Clerk ${method} ${pathname} -> ${response.status}`);
    err.status = response.status;
    err.body = json;
    throw err;
  }
  return json;
}

function summarizeTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    lifetime: template.lifetime,
    claimKeys: Object.keys(template.claims ?? {}),
    hasAudConvex: template.claims?.aud === "convex",
    hasEmailShortcode:
      typeof template.claims?.email === "string" &&
      template.claims.email.includes("primary_email"),
  };
}

const listed = await clerk("/jwt_templates");
const templates = Array.isArray(listed) ? listed : listed?.data ?? [];
console.log(
  "existing_templates",
  templates.map((t) => t.name),
);

const existing = templates.find((t) => t.name === "convex");
const payload = {
  name: "convex",
  claims: CLAIMS,
  lifetime: 3600,
  allowed_clock_skew: 5,
};

if (!existing) {
  const created = await clerk("/jwt_templates", "POST", payload);
  console.log("created", summarizeTemplate(created));
} else {
  const updated = await clerk(`/jwt_templates/${existing.id}`, "PATCH", payload);
  console.log("updated", summarizeTemplate(updated));
}
