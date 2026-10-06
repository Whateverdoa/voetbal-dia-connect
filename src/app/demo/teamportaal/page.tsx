import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { TeamPortalDemo } from "@/components/team-portal/TeamPortalDemo";
import { isTeamPortalDemoEnabled } from "@/lib/team-portal/demoRoute";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teamportaal demo · DIA",
  description: "Interactief teamportaal met fictieve spelers en lokale demogegevens.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#1B5E20",
};

export default function TeamPortalDemoPage() {
  const enabled = isTeamPortalDemoEnabled({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    TEAM_PORTAL_DEMO_ENABLED: process.env.TEAM_PORTAL_DEMO_ENABLED,
  });
  if (!enabled) notFound();

  return <TeamPortalDemo />;
}
