"use client";

import Link from "next/link";

interface MatchErrorScreenProps {
  message: string;
  backHref?: string;
  backLabel?: string;
}

export function MatchErrorScreen({
  message,
  backHref = "/coach",
  backLabel = "← Terug naar dashboard",
}: MatchErrorScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-red-600 font-medium mb-4">{message}</p>
        <Link
          href={backHref}
          className="inline-block px-6 py-3 bg-dia-green text-white rounded-xl font-semibold
                     min-h-[48px] hover:bg-dia-green-light transition-colors"
        >
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
