"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefereeMatchList } from "@/components/referee/RefereeMatchList";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function ScheidsrechterPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Scheidsrechter toegang</h1>
          <p className="text-sm text-gray-600">
            Deze omgeving verwacht Clerk-login via e-mail en rollen.
          </p>
          <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-white">
            Terug naar home
          </Link>
        </div>
      </main>
    );
  }

  return <RefereePageWithClerk />;
}

function RefereePageWithClerk() {
  const { signOut } = useClerk();
  const data = useQuery(api.matches.getMatchesForReferee, {});

  if (data === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-600">Scheidsrechterdashboard laden...</p>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Geen scheidsrechtertoegang</h1>
          <p className="text-sm text-gray-600">
            Dit account heeft geen actieve scheidsrechter-rol of is nog niet gekoppeld aan een scheidsrechterrecord.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-in"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-white"
            >
              Naar inloggen
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut({ redirectUrl: "/" });
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <RefereeMatchList
      refereeName={data.referee.name}
      matches={data.matches}
      onLogout={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
