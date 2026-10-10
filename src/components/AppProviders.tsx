"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkNav } from "./ClerkNav";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // This public, in-memory example must also work without auth or backend connectivity.
  if (pathname === "/demo/wisselmodule") return <>{children}</>;

  const content = <ConvexClientProvider>{hasClerkPublishableKey ? <ClerkNav /> : null}{children}</ConvexClientProvider>;

  if (!hasClerkPublishableKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
