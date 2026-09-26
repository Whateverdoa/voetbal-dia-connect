import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { TeamPortalDemo } from "@/components/team-portal/TeamPortalDemo";
import { getLocalJo13DemoProfile } from "@/lib/team-portal/localRoster.server";
import { isTeamPortalDemoEnabled } from "@/lib/team-portal/demoRoute";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "JO13-02 · Teamportaal proefversie · DIA",
  description: "Lokale proefversie van het DIA JO13-02-teamportaal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5,
  userScalable: true, viewportFit: "cover", themeColor: "#1B5E20",
};

export default function Jo13TeamPortalPilotPage() {
  if (!isTeamPortalDemoEnabled({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    TEAM_PORTAL_DEMO_ENABLED: process.env.TEAM_PORTAL_DEMO_ENABLED,
  })) notFound();

  return <TeamPortalDemo profile={getLocalJo13DemoProfile()} />;
}
