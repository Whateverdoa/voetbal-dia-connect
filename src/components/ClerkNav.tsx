"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

/**
 * Global auth nav: Sign In / Sign Up when signed out, UserButton when signed in.
 * Rendered only when Clerk is configured (inside ClerkProvider in AppProviders).
 */
export function ClerkNav() {
  return (
    <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-end gap-3">
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
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}
