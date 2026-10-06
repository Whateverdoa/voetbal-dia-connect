"use client";

import { createContext, useContext, type ReactNode } from "react";
import { GENERAL_DEMO_PROFILE, type DemoProfile } from "@/lib/team-portal/demoProfiles";

const DemoProfileContext = createContext<DemoProfile>(GENERAL_DEMO_PROFILE);

export function DemoProfileProvider({ profile, children }: { profile: DemoProfile; children: ReactNode }) {
  return <DemoProfileContext.Provider value={profile}>{children}</DemoProfileContext.Provider>;
}

export function useDemoProfile(): DemoProfile {
  return useContext(DemoProfileContext);
}
