"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { canPresentTactics } from "@/lib/auth/roles";

/** Coach or admin session required to view Opstelling / presentatie studio. */
export function useStaffPresentationAccess(): {
  rolesReady: boolean;
  allowed: boolean;
} {
  const { isLoaded, isSignedIn } = useUser();
  const access = useQuery(api.userQueries.getMyRoles);
  const rolesReady = isLoaded && access !== undefined;
  const allowed =
    isSignedIn === true && canPresentTactics(access?.roles ?? []);
  return { rolesReady, allowed };
}
