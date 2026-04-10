import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

export function HelpShell({
  title,
  subtitle,
  backHref = "/help",
  backLabel = "Terug naar uitleg",
  children,
}: Props) {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-dia-green text-white p-4 shrink-0">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <Link
            href={backHref}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={backLabel}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-white/85 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-8">{children}</div>
    </main>
  );
}
