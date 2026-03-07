"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { RefereeMatchList } from "@/components/referee/RefereeMatchList";

const PIN_LOAD_TIMEOUT_MS = 6000;
const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function ScheidsrechterPage() {
  const accountMode = hasClerkPublishableKey;
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | null>(
    accountMode ? "" : null
  );
  const [error, setError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  // Only query after the referee submits their PIN
  const data = useQuery(
    api.matches.getMatchesForReferee,
    submittedPin !== null ? {} : "skip"
  );

  useEffect(() => {
    if (!submittedPin || data !== undefined) {
      setConnectionTimeout(false);
      return;
    }
    const t = setTimeout(() => setConnectionTimeout(true), PIN_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [submittedPin, data]);

  useEffect(() => {
    if (!accountMode || submittedPin) return;
    setSubmittedPin("");
  }, [accountMode, submittedPin]);

  // Handle PIN form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (accountMode) {
      setSubmittedPin("");
      return;
    }

    if (pin.length < 4) {
      setError("Voer een geldige PIN in (minimaal 4 cijfers)");
      return;
    }

    setSubmittedPin(pin);
  };

  // If PIN was submitted but query returned null → invalid
  const isInvalidPin = submittedPin !== null && data === null;

  // Reset to PIN entry
  const handleLogout = () => {
    setSubmittedPin(null);
    setPin("");
    setError(null);
    setConnectionTimeout(false);
  };

  const handleRetryConnection = () => {
    setConnectionTimeout(false);
    setSubmittedPin(null);
  };

  // Show match list after successful login
  if (submittedPin !== null && data) {
    return (
      <RefereeMatchList
        refereeName={data.referee.name}
        matches={data.matches}
        onLogout={handleLogout}
      />
    );
  }

  if (accountMode && submittedPin !== null && data === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-600 font-medium">Scheidsrechterrechten controleren...</p>
      </main>
    );
  }

  if (accountMode && submittedPin !== null && data === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-dia-green">Geen scheidsrechtertoegang</h1>
          <p className="text-sm text-gray-600">
            Dit account heeft nog geen scheidsrechterkoppeling via e-mail.
          </p>
          <Link href="/" className="text-sm text-dia-green hover:underline">
            ← Terug naar start
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-dia-green">Scheidsrechter</h1>
          <p className="mt-2 text-gray-600">
            Voer je PIN in om je wedstrijden te zien
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PIN input */}
          <div>
            <label
              htmlFor="ref-pin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Scheidsrechter PIN
            </label>
            <input
              id="ref-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
                // Clear previous submission if typing again
                if (submittedPin) setSubmittedPin(null);
              }}
              placeholder="4-6 cijfers"
              className="w-full px-4 py-3 text-center text-xl tracking-widest
                         border-2 border-gray-300 rounded-lg
                         focus:border-dia-green focus:outline-none"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Error messages */}
          {(error || isInvalidPin) && !accountMode && (
            <p className="text-red-600 text-sm text-center font-medium">
              {error ?? "Ongeldige PIN of account niet actief"}
            </p>
          )}

          {/* Loading state */}
          {submittedPin !== null && data === undefined && !connectionTimeout && (
            <p className="text-gray-500 text-sm text-center">
              Gegevens laden...
            </p>
          )}

          {/* Connection timeout */}
          {connectionTimeout && (
            <>
              <p className="text-amber-600 text-sm font-medium text-center">
                Geen verbinding. Controleer je internet en probeer opnieuw.
              </p>
              <button
                type="button"
                onClick={handleRetryConnection}
                className="w-full py-3 rounded-xl border-2 border-amber-500 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
              >
                Opnieuw proberen
              </button>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              pin.length < 4 ||
              (submittedPin !== null && data === undefined && !connectionTimeout)
            }
            className="w-full py-3 px-4 bg-dia-green text-white font-semibold rounded-lg
                       hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors min-h-[48px]"
          >
            {accountMode ? "Laden..." : "Inloggen"}
          </button>
        </form>

        {/* Back link */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-dia-green">
            ← Terug naar startpagina
          </Link>
        </div>
      </div>
    </main>
  );
}
