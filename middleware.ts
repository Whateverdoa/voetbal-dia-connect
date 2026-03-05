import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hasClerkEnv =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/coach(.*)",
  "/scheidsrechter(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isCoachRoute = createRouteMatcher(["/coach(.*)"]);
const isRefereeRoute = createRouteMatcher(["/scheidsrechter(.*)"]);

type AppRole = "admin" | "coach" | "referee";

function getRoleFromClaims(authResult: { sessionClaims?: unknown }): AppRole | null {
  const claims = authResult.sessionClaims as
    | {
        metadata?: { role?: string };
        public_metadata?: { role?: string };
        publicMetadata?: { role?: string };
      }
    | undefined;
  const roleCandidate =
    claims?.metadata?.role ??
    claims?.public_metadata?.role ??
    claims?.publicMetadata?.role;

  if (roleCandidate === "admin" || roleCandidate === "coach" || roleCandidate === "referee") {
    return roleCandidate;
  }
  return null;
}

function isRoleAllowedForRoute(req: NextRequest, role: AppRole): boolean {
  if (role === "admin") return true;
  if (isCoachRoute(req)) return role === "coach";
  if (isRefereeRoute(req)) return role === "referee";
  if (isAdminRoute(req)) return false;
  return true;
}

function unauthorizedRedirect(req: NextRequest): NextResponse {
  const deniedUrl = new URL("/geen-toegang", req.url);
  deniedUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(deniedUrl);
}

export default clerkMiddleware(async (auth, req) => {
  if (!hasClerkEnv) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();

    const authResult = await auth();
    const role = getRoleFromClaims(authResult);
    if (!role) {
      return unauthorizedRedirect(req);
    }
    if (!isRoleAllowedForRoute(req, role)) {
      return unauthorizedRedirect(req);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
