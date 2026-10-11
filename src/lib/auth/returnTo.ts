/** Only local team portals can bypass the normal staff onboarding destination. */
export function teamPortalReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/team/") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://dia.invalid");
    if (url.origin !== "https://dia.invalid" || !/^\/team\/[^/]+\/app(?:\/invite\/[^/]+)?\/?$/.test(url.pathname)) return null;
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded) || !/^\/team\/[^/]+\/app(?:\/invite\/[^/]+)?\/?$/.test(decoded)) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function authPageUrl(page: "sign-in" | "sign-up", returnTo: string): string {
  const safe = teamPortalReturnTo(returnTo);
  return safe ? `/${page}?returnTo=${encodeURIComponent(safe)}` : `/${page}`;
}
