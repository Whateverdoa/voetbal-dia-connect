import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uitleg",
  description:
    "Hoe DIA Live werkt: meekijken zonder account, coaches en wedstrijdbegeleiders via de club, admins en publiek — uitleg lezen zonder in te loggen.",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
