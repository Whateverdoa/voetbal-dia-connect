"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isTeamPortalDemoPath } from "@/lib/team-portal/demoRoute";

// Keep provider module initialization and role synchronization out of the demo.
const ConnectedAppShell = dynamic(() => import("./ConnectedAppShell"));

export function RouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isTeamPortalDemoPath(pathname)) return children;

  return <ConnectedAppShell>{children}</ConnectedAppShell>;
}
