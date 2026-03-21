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

const clerkHandler = hasClerkEnv
  ? clerkMiddleware(async (auth, req) => {
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

        // Allow through if no role (e.g. claims not synced yet): page shows PIN form or link-PIN.
        if (roles.length > 0 && !isRoleAllowedForRoute(req, roles)) {
          return unauthorizedRedirect(req);
        }
      }

      return NextResponse.next();
    })
  : null;

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!clerkHandler) {
    if (isRoleOnboardingRoute(req)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  return clerkHandler(req, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
