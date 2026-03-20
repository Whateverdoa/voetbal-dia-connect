import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export function AppProviders({ children }: { children: ReactNode }) {
  const content = <ConvexClientProvider>{children}</ConvexClientProvider>;

  if (!hasClerkPublishableKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
