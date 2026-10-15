"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState, type ReactNode } from "react";
import { usePortalAuth } from "@/lib/usePortalAuth";

export function PortalProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
  );
  return (
    <ConvexProviderWithClerk client={client} useAuth={usePortalAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
