"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { RefereeMatchList } from "@/components/referee/RefereeMatchList";

const ACCESS_LOAD_TIMEOUT_MS = 6000;
const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function ScheidsrechterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  useEffect(() => {
    if (!hasClerkPublishableKey || submitted) return;
    setSubmitted(true);
  }, [submitted]);

  const data = useQuery(api.matches.getMatchesForReferee, submitted ? {} : "skip");

  useEffect(() => {
    if (!submitted || data !== undefined) {
      setConnectionTimeout(false);
      return;
    }
    const timer = setTimeout(() => setConnectionTimeout(true), ACCESS_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [submitted, data]);

  const handleLogout = () => {
    setSubmitted(false);
    setConnectionTimeout(false);
  };

  const handleRetryConnection = () => {
    setConnectionTimeout(false);
    setSubmitted(false);
  };

  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-dia-green">Clerk vereist</h1>
          <p className="text-sm text-gray-600">
            Deze omgeving gebruikt alleen account-login via e-mail en rollen.
          </p>
          <Link href="/" className="text-sm text-dia-green hover:underline">
            ← Terug naar start
          </Link>
        </div>
      </main>
    );
  }

  if (submitted && data) {
    return (
      <RefereeMatchList
        refereeName={data.referee.name}
        matches={data.matches}
        onLogout={handleLogout}
      />
    );
  }

  if (submitted && data === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-600 font-medium">Scheidsrechterrechten controleren...</p>
      </main>
    );
  }

  if (submitted && data === null) {
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
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-dia-green">Scheidsrechter</h1>
        <p className="text-gray-600">Toegang verloopt via accountrechten (Clerk).</p>

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

        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-dia-green">
            ← Terug naar startpagina
          </Link>
        </div>
      </div>
    </main>
  );
}
