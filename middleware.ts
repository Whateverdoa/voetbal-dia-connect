import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import {
  hasRole,
  parseRolesFromSessionClaims,
  type AppRole,
} from "@/lib/auth/roles";

const hasClerkEnv =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/coach(.*)",
  "/scheidsrechter(.*)",
]);
const isRoleOnboardingRoute = createRouteMatcher(["/onboarding/rol(.*)"]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isCoachRoute = createRouteMatcher(["/coach(.*)"]);
const isRefereeRoute = createRouteMatcher(["/scheidsrechter(.*)"]);

function getRolesFromClaims(authResult: { sessionClaims?: unknown }): AppRole[] {
  return parseRolesFromSessionClaims(authResult.sessionClaims);
}

function isRoleAllowedForRoute(req: NextRequest, roles: AppRole[]): boolean {
  if (hasRole(roles, "admin")) return true;
  if (isCoachRoute(req)) return hasRole(roles, "coach");
  if (isRefereeRoute(req)) return hasRole(roles, "referee");
  if (isAdminRoute(req)) return false;
  return true;
}

function unauthorizedRedirect(req: NextRequest): NextResponse {
  const deniedUrl = new URL("/geen-toegang", req.url);
  deniedUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(deniedUrl);
}

function roleOnboardingRedirect(req: NextRequest): NextResponse {
  const onboardingUrl = new URL("/onboarding/rol", req.url);
  onboardingUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(onboardingUrl);
}

const clerkHandler = (() => {
  if (!hasClerkEnv) return null;
  try {
    return clerkMiddleware(async (auth, req) => {
      try {
        if (isRoleOnboardingRoute(req)) {
          await auth.protect();
          const authResult = await auth();
          const roles = getRolesFromClaims(authResult);
          if (roles.length > 0) return NextResponse.redirect(new URL("/", req.url));
          return NextResponse.next();
        }
        if (isProtectedRoute(req)) {
          await auth.protect();
          const authResult = await auth();
          const roles = getRolesFromClaims(authResult);
          if (roles.length > 0 && !isRoleAllowedForRoute(req, roles)) {
            return unauthorizedRedirect(req);
          }
          // Allow through if no role (e.g. claims not synced yet): page shows PIN form or link-PIN
        }
        return NextResponse.next();
      } catch {
        return NextResponse.next();
      }
    });
  } catch {
    return null;
  }
})();

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  if (!clerkHandler) {
    if (isRoleOnboardingRoute(req)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
  try {
    return await clerkHandler(req, event);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
