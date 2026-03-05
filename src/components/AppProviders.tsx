"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

interface AppProvidersProps {
  children: ReactNode;
}

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export function AppProviders({ children }: AppProvidersProps) {
  if (!hasClerkPublishableKey) {
    return <ConvexClientProvider>{children}</ConvexClientProvider>;
  }

  return (
    <ClerkProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  );
}
