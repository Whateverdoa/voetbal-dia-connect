import type { Metadata, Viewport } from "next";
import { TeamMatchReport } from "@/components/team-portal/TeamMatchReport";

export const metadata: Metadata = {
  title: "Wedstrijdverslag · DIA Team",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5,
  userScalable: true, viewportFit: "cover", themeColor: "#1B5E20",
};

export default async function TeamMatchReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TeamMatchReport teamSlug={slug.toLowerCase()} />;
}
