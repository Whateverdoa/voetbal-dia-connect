"use client";

import Link from "next/link";
import { PresentationShell } from "@/components/presentation/PresentationShell";

interface UnavailablePresentationSurfaceProps {
  title: string;
  body: string;
}

/** Shown when a presentation surface is temporarily switched off. */
export function UnavailablePresentationSurface({
  title,
  body,
}: UnavailablePresentationSurfaceProps) {
  return (
    <PresentationShell title={title}>
      <p className="text-slate-400 text-center py-8">{body}</p>
      <div className="flex justify-center">
        <Link
          href="/coach/presenteren"
          className="inline-flex min-h-[48px] items-center rounded-xl bg-dia-yellow px-5 py-3 font-semibold text-black"
        >
          Naar presenteren
        </Link>
      </div>
    </PresentationShell>
  );
}
