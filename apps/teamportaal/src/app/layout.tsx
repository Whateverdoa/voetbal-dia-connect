import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { nlNL } from "@clerk/localizations";
import { PortalProviders } from "@/components/PortalProviders";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://team.dialive.nl"),
  title: "DIA Live · Samen voor JO13-2",
  description:
    "Het teamportaal van DIA JO13-2: selectie, wedstrijden en persoonlijke ontwikkeling.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className="bg-[#10110f] font-sans text-[#f7f6ef] antialiased selection:bg-[#efc44b] selection:text-black">
        <a
          href="#inhoud"
          className="sr-only z-50 rounded-lg bg-[#efc44b] px-5 py-3 text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Naar de inhoud
        </a>
        <ClerkProvider
          localization={nlNL}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/start"
          signUpFallbackRedirectUrl="/start"
        >
          <PortalProviders>
            <SiteHeader />
            {children}
            <SiteFooter />
          </PortalProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
