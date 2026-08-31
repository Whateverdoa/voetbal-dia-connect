/**
 * Helpers for the Clerk JWT template named `convex`.
 *
 * Convex resolves user roles from the `email` claim in this template. The Clerk
 * instance is shared with other apps, so the template can be changed outside
 * this repository — hence both an ensure script and a guard script use this.
 */
import fs from "node:fs";
import path from "node:path";

export const TEMPLATE_NAME = "convex";

export const TEMPLATE_CLAIMS = {
  aud: "convex",
  email: "{{user.primary_email_address}}",
  name: "{{user.full_name}}",
  picture: "{{user.image_url}}",
};

export const TEMPLATE_PAYLOAD = {
  name: TEMPLATE_NAME,
  claims: TEMPLATE_CLAIMS,
  lifetime: 3600,
  allowed_clock_skew: 5,
};

/**
 * @param {string} contents
 * @returns {Record<string, string>}
 */
export function parseEnvFile(contents) {
  /** @type {Record<string, string>} */
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    let value = trimmed.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

export function resolveClerkSecret(cwd = process.cwd()) {
  if (process.env.CLERK_SECRET_KEY) return process.env.CLERK_SECRET_KEY;
  const envPath = path.join(cwd, ".env.local");
  if (!fs.existsSync(envPath)) return null;
  const env = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  return env.CLERK_SECRET_KEY ?? null;
}

export async function clerkRequest(secret, pathname, method = "GET", body) {
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
    const error = new Error(`Clerk ${method} ${pathname} -> ${response.status}`);
    error.status = response.status;
    error.body = json;
    throw error;
  }
  return json;
}

export async function fetchConvexTemplate(secret) {
  const listed = await clerkRequest(secret, "/jwt_templates");
  const templates = Array.isArray(listed) ? listed : (listed?.data ?? []);
  return {
    templates,
    template: templates.find((entry) => entry.name === TEMPLATE_NAME) ?? null,
  };
}

/** Reports why a template would break role resolution, without calling Clerk. */
export function inspectTemplate(template) {
  if (!template) {
    return {
      ok: false,
      problems: [`JWT template "${TEMPLATE_NAME}" does not exist in Clerk`],
    };
  }

  const problems = [];
  const claims = template.claims ?? {};

  if (claims.aud !== TEMPLATE_CLAIMS.aud) {
    problems.push(
      `claim "aud" is ${JSON.stringify(claims.aud ?? null)} instead of "${TEMPLATE_CLAIMS.aud}"`,
    );
  }

  const email = typeof claims.email === "string" ? claims.email : "";
  if (!email.includes("primary_email")) {
    problems.push(
      `claim "email" is ${JSON.stringify(claims.email ?? null)} and must use the {{user.primary_email_address}} shortcode`,
    );
  }

  return { ok: problems.length === 0, problems };
}

export function summarizeTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    lifetime: template.lifetime,
    claimKeys: Object.keys(template.claims ?? {}),
  };
}
