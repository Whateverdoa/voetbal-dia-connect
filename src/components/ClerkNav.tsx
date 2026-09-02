"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useAppNavHeight } from "@/hooks/useAppNavHeight";
import {
  canPresentTactics,
  parseRolesFromMetadata,
  type AppRole,
} from "@/lib/auth/roles";

/**
 * Global auth nav. Uses useUser() instead of Clerk <Show/>, which is a
 * server component in @clerk/nextjs v7 and renders nothing in this client header.
 */
export function ClerkNav() {
  const headerRef = useRef<HTMLElement>(null);
  useAppNavHeight(headerRef);
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const access = useQuery(api.userQueries.getMyRoles);
  const clerkRoles = parseRolesFromMetadata(user?.publicMetadata);
  const convexRoles = access?.roles ?? [];
  const roles: AppRole[] = [...clerkRoles];
  for (const role of convexRoles) {
    if (!roles.includes(role)) roles.push(role);
  }
  const isAdmin = roles.includes("admin");
  const isCoach = roles.includes("coach");
  const isReferee = roles.includes("referee");

  return (
    <header
      ref={headerRef}
      className="border-b border-gray-200 bg-white/95 sticky top-0 z-10"
    >
      <div className="max-w-4xl mx-auto px-4 min-h-12 py-2 flex items-center justify-between gap-3">
        {isSignedIn ? (
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
            <Link href="/" className="font-medium text-gray-600 hover:text-gray-900">
              Live
            </Link>
            {isCoach || isAdmin ? (
              <Link href="/coach" className="font-medium text-dia-black hover:text-dia-black">
                Coach
              </Link>
            ) : null}
            {canPresentTactics(roles) ? (
              <Link
                href="/coach/presenteren"
                className="font-medium text-dia-black hover:text-dia-black"
              >
                Presenteren
              </Link>
            ) : null}
            {isReferee || isAdmin ? (
              <Link
                href="/scheidsrechter"
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                Scheidsrechter
              </Link>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className="font-medium text-amber-700 hover:text-amber-800">
                Admin
              </Link>
            ) : null}
            <Link href="/help" className="font-medium text-gray-600 hover:text-gray-900">
              Handleiding
            </Link>
          </nav>
        ) : (
          <nav className="flex items-center text-xs sm:text-sm">
            <Link
              href="/help"
              className="font-medium text-dia-black hover:text-dia-black min-h-[44px] inline-flex items-center"
            >
              Handleiding
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <span className="hidden sm:inline text-xs text-gray-600 max-w-[220px] truncate">
                {user?.primaryEmailAddress?.emailAddress ?? "Ingelogd"}
              </span>
              <button
                type="button"
                onClick={() => {
                  void signOut({ redirectUrl: "/" });
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Uitloggen
              </button>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="text-sm font-medium text-dia-black hover:text-dia-black"
                >
                  Inloggen
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="text-sm font-medium text-black bg-dia-green px-3 py-1.5 rounded-lg hover:bg-dia-yellow-deep"
                >
                  Registreren
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
