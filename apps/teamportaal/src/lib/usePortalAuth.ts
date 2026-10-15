"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

type GetToken = ReturnType<typeof useAuth>["getToken"];

export function usePortalAuth() {
  const auth = useAuth();
  const clerkGetToken = auth.getToken;
  const getToken = useCallback<GetToken>(
    // The session token can have aud=convex without the email claims. Always
    // request the named template so the backend can verify team membership.
    (options) => clerkGetToken({ template: "convex", skipCache: options?.skipCache }),
    [clerkGetToken],
  );
  return { ...auth, getToken };
}
