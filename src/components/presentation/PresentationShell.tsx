"use client";

import type { ReactNode } from "react";

interface PresentationShellProps {
  title: string;
  subtitle?: string;
  kiosk?: boolean;
  children: ReactNode;
}

/** Fullscreen dark shell for kleedkamer / kantine TV. */
export function PresentationShell({
  title,
  subtitle,
  kiosk = false,
  children,
}: PresentationShellProps) {
  return (
    <main
      className={`h-dvh bg-dia-black text-white flex flex-col overflow-hidden ${kiosk ? "select-none" : ""}`}
    >
      <header className="shrink-0 px-6 py-4 bg-dia-yellow text-black border-b border-dia-black/20 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black font-semibold">
            DIA Live Presentatie
          </p>
          <h1 className="text-2xl md:text-4xl font-bold mt-1 text-black">{title}</h1>
          {subtitle ? (
            <p className="text-black/70 text-sm md:text-base mt-1">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6 flex flex-col">
        {children}
      </div>
    </main>
  );
}
