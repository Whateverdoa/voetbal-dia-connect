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
      className={`min-h-screen bg-dia-black text-white flex flex-col ${kiosk ? "select-none" : ""}`}
    >
      <header className="shrink-0 px-6 py-4 border-b border-dia-yellow/30 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-dia-yellow font-semibold">
            DIA Live Presentatie
          </p>
          <h1 className="text-2xl md:text-4xl font-bold mt-1 text-white">{title}</h1>
          {subtitle ? (
            <p className="text-dia-yellow/60 text-sm md:text-base mt-1">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="flex-1 p-4 md:p-6 overflow-auto">{children}</div>
    </main>
  );
}
