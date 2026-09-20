"use client";

import type { ReactNode } from "react";

interface PresentationShellProps {
  title: string;
  subtitle?: string;
  kiosk?: boolean;
  /** Header controls, e.g. the pitch layout toggle. Hidden in kiosk mode. */
  actions?: ReactNode;
  /** Smaller chrome so the pitch can claim more of the viewport. */
  compact?: boolean;
  children: ReactNode;
}

/** Fullscreen dark shell for kleedkamer / kantine TV. */
export function PresentationShell({
  title,
  subtitle,
  kiosk = false,
  actions,
  compact = false,
  children,
}: PresentationShellProps) {
  return (
    <main
      className={`bg-dia-black text-white flex flex-col overflow-hidden ${kiosk ? "select-none" : ""}`}
      style={{ height: "calc(100dvh - var(--app-nav-height, 0px))" }}
    >
      <header
        className={`shrink-0 px-6 bg-dia-green text-white border-b border-dia-green-dark flex items-end justify-between gap-4 ${
          compact ? "py-2" : "py-4"
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/80 font-semibold">
            {compact ? "DIA Live Plannen" : "DIA Live Presentatie"}
          </p>
          <h1
            className={`font-bold mt-1 ${compact ? "text-lg md:text-2xl" : "text-2xl md:text-4xl"}`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="text-white/80 text-sm md:text-base mt-1">{subtitle}</p>
          ) : null}
        </div>
        {actions && !kiosk ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div
        className={`flex-1 min-h-0 overflow-hidden flex flex-col ${
          compact ? "p-2 md:p-3" : "p-4 md:p-6"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
