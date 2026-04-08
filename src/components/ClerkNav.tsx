"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

/**
 * Global auth nav: Sign In / Sign Up when signed out, UserButton when signed in.
 * Rendered only when Clerk is configured (inside ClerkProvider in AppProviders).
 */
export function ClerkNav() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const access = useQuery(api.userQueries.getMyRoles);
  const roles = access?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isCoach = roles.includes("coach");
  const isReferee = roles.includes("referee");

  return (
    <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 min-h-12 py-2 flex items-center justify-between gap-3">
        <Show when="signed-out">
          <nav className="flex items-center text-xs sm:text-sm">
            <Link
              href="/help"
              className="font-medium text-dia-green hover:text-green-700 min-h-[44px] inline-flex items-center"
            >
              Uitleg
            </Link>
          </nav>
        </Show>

        <Show when="signed-in">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
            <Link href="/" className="font-medium text-gray-600 hover:text-gray-900">
              Live
            </Link>
            {isCoach ? (
              <Link href="/coach" className="font-medium text-dia-green hover:text-green-700">
                Coach
              </Link>
            ) : null}
            {isReferee ? (
              <Link href="/scheidsrechter" className="font-medium text-gray-700 hover:text-gray-900">
                Scheidsrechter
              </Link>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className="font-medium text-amber-700 hover:text-amber-800">
                Admin
              </Link>
            ) : null}
            <Link href="/help" className="font-medium text-gray-600 hover:text-gray-900">
              Uitleg
            </Link>
          </nav>
        </Show>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="text-sm font-medium text-dia-green hover:text-green-700"
            >
              Inloggen
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="text-sm font-medium text-white bg-dia-green px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              Registreren
            </button>
          </SignUpButton>
          </Show>
          <Show when="signed-in">
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
          </Show>
        </div>
      </div>
    </header>
  );
}
