export function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function parseEmailList(raw = process.env.CLERK_BOOTSTRAP_ADMIN_EMAILS ?? "") {
  return raw
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter((value): value is string => value !== null);
}

export function isBootstrapAdminEmail(
  email?: string | null,
  raw = process.env.CLERK_BOOTSTRAP_ADMIN_EMAILS ?? ""
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  return parseEmailList(raw).includes(normalizedEmail);
}
