"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useCallback } from "react";

type ClerkGetToken = ReturnType<typeof useClerkAuth>["getToken"];

let convexTemplateCacheBusted = false;

/**
 * Always mint the named `convex` JWT (includes email). ConvexProviderWithClerk
 * otherwise uses the default session token when `aud === "convex"`, which has
 * no email — getMyRoles then returns [].
 */
export function useAuthForConvex() {
  const auth = useClerkAuth();

  const getToken = useCallback<ClerkGetToken>(
    async (options) => {
      const skipCache = Boolean(options?.skipCache) || !convexTemplateCacheBusted;
      convexTemplateCacheBusted = true;
      try {
        const templated = await auth.getToken({
          template: "convex",
          skipCache,
        });
        if (templated) return templated;
      } catch {
        // template missing or Clerk 404
      }
      try {
        return await auth.getToken({ skipCache: options?.skipCache });
      } catch {
        return null;
      }
    },
    [auth],
  );

  return { ...auth, getToken };
}
