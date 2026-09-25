import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RouteShell } from "@/components/RouteShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DIA Wedstrijduitslagen Live",
  description: "Live wedstrijduitslagen voor DIA jeugdteams",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DIA Uitslagen",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

// Tighter viewport reduces layout jump and unintended zoom on rotate (pitch-side phones).
// Trade-off: userScalable false limits pinch-zoom (WCAG); intentional for stable match UI.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1B5E20",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${inter.className} overflow-x-hidden`}>
        <RouteShell>{children}</RouteShell>
      </body>
    </html>
  );
}
