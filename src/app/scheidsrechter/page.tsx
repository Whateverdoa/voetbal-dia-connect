"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { RefereeMatchList } from "@/components/referee/RefereeMatchList";

export default function ScheidsrechterPage() {
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only query after the referee submits their PIN
  const data = useQuery(
    api.matches.getMatchesForReferee,
    submittedPin ? { pin: submittedPin } : "skip"
  );

  // Handle PIN form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
  };

  // Show match list after successful login
  if (submittedPin && data) {
    return (
      <RefereeMatchList
        refereeName={data.referee.name}
        matches={data.matches}
        pin={submittedPin}
        onLogout={handleLogout}
      />
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
          {(error || isInvalidPin) && (
            <p className="text-red-600 text-sm text-center font-medium">
              {error ?? "Ongeldige PIN of account niet actief"}
            </p>
          )}

          {/* Loading state */}
          {submittedPin && data === undefined && (
            <p className="text-gray-500 text-sm text-center">
              Gegevens laden...
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pin.length < 4 || (submittedPin !== null && data === undefined)}
            className="w-full py-3 px-4 bg-dia-green text-white font-semibold rounded-lg
                       hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors min-h-[48px]"
          >
            Inloggen
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
