"use client";

import type { ReactNode } from "react";
import { AppProviders } from "./AppProviders";
import { ClerkNav } from "./ClerkNav";
import { SignedInRoleSync } from "./SignedInRoleSync";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

/** The existing application shell, loaded only outside the isolated demo. */
export default function ConnectedAppShell({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      {hasClerkPublishableKey ? (
        <>
          <SignedInRoleSync />
          <ClerkNav />
        </>
      ) : null}
      {children}
    </AppProviders>
  );
}
