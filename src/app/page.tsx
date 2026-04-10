"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MatchBrowser } from "@/components/MatchBrowser";

export default function Home() {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      router.push(`/live/${code.toUpperCase()}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-12">
      <div className="w-full max-w-4xl space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-dia-green">
            DIA Wedstrijduitslagen Live
          </h1>
          <p className="text-gray-600">Volg de wedstrijd live</p>
          <div>
            <Link
              href="/help"
              className="inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-dia-green hover:text-green-700 underline underline-offset-4"
            >
              Hoe werkt het?
            </Link>
            <span className="text-xs text-gray-500 block mt-1">
              Meekijken kan zonder account; uitleg ook voor coaches, wedstrijdbegeleiders en club.
            </span>
          </div>
        </div>

        {/* Match browser — primary element */}
        <MatchBrowser />

        {/* Vandaag live link */}
        <div className="text-center">
          <Link
            href="/standen"
            className="text-sm font-medium text-dia-green hover:text-green-700 transition-colors"
          >
            Vandaag live
          </Link>
        </div>

        {/* Collapsible code input for edge cases */}
        <div className="text-center">
          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Heb je een code?
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Wedstrijd code"
                  className="flex-1 px-3 py-2 text-center text-lg tracking-widest uppercase border-2 border-gray-300 rounded-lg focus:border-dia-green focus:outline-none"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={code.length !== 6}
                  className="px-4 py-2 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Ga
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowCodeInput(false); setCode(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Sluiten
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-400">
        <p>DIA Jeugdvoetbal</p>
      </footer>
    </main>
  );
}
