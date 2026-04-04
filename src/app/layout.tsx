import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { ClerkNav } from "@/components/ClerkNav";

const inter = Inter({ subsets: ["latin"] });
const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

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
      <body className={inter.className}>
        <AppProviders>
          {hasClerkPublishableKey ? <ClerkNav /> : null}
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
