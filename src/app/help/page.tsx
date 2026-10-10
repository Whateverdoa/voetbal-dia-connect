import Link from "next/link";
import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { helpIndexPage, helpIntroCards } from "@/content/help/copy";

export default function HelpIndexPage() {
  return (
    <HelpShell
      title={helpIndexPage.title}
      subtitle={helpIndexPage.subtitle}
      backHref="/"
      backLabel="Terug naar home"
    >
      <HelpPageBody blocks={helpIndexPage.blocks} />

      <div className="grid gap-3 sm:grid-cols-2">
        {helpIntroCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-dia-yellow hover:bg-dia-green-light/40 min-h-[44px]"
          >
            <h3 className="font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500">
        <Link href="/help/club-en-rollen" className="underline underline-offset-2 hover:text-dia-black">
          Rollen en e-mail
        </Link>
      </p>
    </HelpShell>
  );
}
