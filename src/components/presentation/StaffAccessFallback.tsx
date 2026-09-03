"use client";

import Link from "next/link";
import { PresentationShell } from "@/components/presentation/PresentationShell";

interface StaffAccessFallbackProps {
  rolesReady: boolean;
  allowed: boolean;
  deniedBody: string;
}

/** Loading / denied screens for coach-admin presentation pages. */
export function StaffAccessFallback({
  rolesReady,
  allowed,
  deniedBody,
}: StaffAccessFallbackProps) {
  if (!rolesReady) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Toegang controleren…</p>
      </PresentationShell>
    );
  }

  if (allowed) return null;

  return (
    <PresentationShell title="Geen toegang">
      <p className="text-slate-400 text-center py-8">{deniedBody}</p>
      <div className="flex justify-center">
        <Link
          href="/sign-in"
          className="inline-flex min-h-[48px] items-center rounded-xl bg-dia-green px-5 py-3 font-semibold text-white"
        >
          Inloggen
        </Link>
      </div>
    </PresentationShell>
  );
}
