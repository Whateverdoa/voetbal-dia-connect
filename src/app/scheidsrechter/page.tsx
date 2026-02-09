"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

export default function ScheidsrechterPage() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const router = useRouter();

  // Only query when both code and pin are filled
  const shouldQuery = code.length >= 4 && pin.length >= 4;
  const match = useQuery(
    api.matches.getForReferee,
    shouldQuery ? { code: code.toUpperCase(), pin } : "skip"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length < 4) {
      setError("Voer een geldige wedstrijd code in");
      return;
    }
    if (pin.length < 4) {
      setError("Voer een geldige scheidsrechter PIN in");
      return;
    }

    setIsChecking(true);

    // The query is reactive — if match is null, credentials are wrong
    if (match === null) {
      setError("Ongeldige wedstrijd code of scheidsrechter PIN");
      setIsChecking(false);
      return;
    }

    if (match === undefined) {
      // Still loading — wait a moment and retry
      setTimeout(() => {
        setIsChecking(false);
        setError("Even geduld, gegevens worden geladen...");
      }, 2000);
      return;
    }

    // Match found — navigate to referee match view
    router.push(
      `/scheidsrechter/match/${match.id}?pin=${encodeURIComponent(pin)}&code=${code.toUpperCase()}`
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-dia-green">Scheidsrechter</h1>
          <p className="mt-2 text-gray-600">Klokbediening voor de wedstrijd</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Match code */}
          <div>
            <label htmlFor="ref-code" className="block text-sm font-medium text-gray-700 mb-1">
              Wedstrijd code
            </label>
            <input
              id="ref-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Bijv. AB12CD"
              className="w-full px-4 py-3 text-center text-xl tracking-widest uppercase
                         border-2 border-gray-300 rounded-lg
                         focus:border-dia-green focus:outline-none"
              maxLength={6}
              autoComplete="off"
            />
          </div>

          {/* Referee PIN */}
          <div>
            <label htmlFor="ref-pin" className="block text-sm font-medium text-gray-700 mb-1">
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
              }}
              placeholder="4-6 cijfers"
              className="w-full px-4 py-3 text-center text-xl tracking-widest
                         border-2 border-gray-300 rounded-lg
                         focus:border-dia-green focus:outline-none"
              maxLength={6}
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={code.length < 4 || pin.length < 4 || isChecking}
            className="w-full py-3 px-4 bg-dia-green text-white font-semibold rounded-lg
                       hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors min-h-[48px]"
          >
            {isChecking ? "Controleren..." : "Open klokbediening"}
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
