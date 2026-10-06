export const TEAM_PORTAL_DEMO_PATH = "/demo/teamportaal";

export function isTeamPortalDemoPath(pathname: string): boolean {
  return (
    pathname === TEAM_PORTAL_DEMO_PATH ||
    pathname.startsWith(`${TEAM_PORTAL_DEMO_PATH}/`)
  );
}

type DemoEnvironment = {
  NODE_ENV?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  TEAM_PORTAL_DEMO_ENABLED?: string;
};

/** Only local development and explicitly enabled previews may serve demo data. */
export function isTeamPortalDemoEnabled(env: DemoEnvironment): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.VERCEL_ENV === "preview") {
    return env.TEAM_PORTAL_DEMO_ENABLED === "true";
  }

  return (
    env.NODE_ENV === "development" &&
    (!env.VERCEL || env.VERCEL === "0") &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "development")
  );
}
