"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import {
  bootstrapFullAccessIfEligible,
  bootstrapRoleLinksFromEmail,
} from "@/app/onboarding/rol/actions";
import { parseRolesFromMetadata } from "@/lib/auth/roles";

/**
 * Role links were only written during /onboarding/rol. After a normal login
 * Clerk metadata stayed empty, so the nav had no Coach/Admin items.
 */
export function SignedInRoleSync() {
  const { user, isSignedIn } = useUser();
  const ranForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    if (parseRolesFromMetadata(user.publicMetadata).length > 0) return;
    if (ranForUserId.current === user.id) return;
    ranForUserId.current = user.id;

    void (async () => {
      const admin = await bootstrapFullAccessIfEligible();
      if (!admin.applied) {
        await bootstrapRoleLinksFromEmail();
      }
      await user.reload();
    })();
  }, [isSignedIn, user]);

  return null;
}
