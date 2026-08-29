import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Handleiding",
  description:
    "Handleiding voor DIA Live: coach, scheidsrechter en admin, plus meekijken zonder account.",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
