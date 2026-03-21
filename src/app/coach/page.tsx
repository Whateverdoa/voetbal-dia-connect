"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CoachDashboard } from "@/components/CoachDashboard";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function CoachPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-dia-green text-white p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">DIA Wedstrijduitslagen Live</h1>
              <p className="text-sm text-white/80">Coach toegang</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Inloggen is nog niet actief</h2>
            <p className="text-sm text-gray-600">
              Deze omgeving verwacht Clerk-login via e-mail en rollen. Configureer Clerk om coachtoegang te gebruiken.
            </p>
            <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-white">
              Terug naar home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <CoachPageWithClerk />;
}

function CoachPageWithClerk() {
  const { signOut } = useClerk();
  const coachData = useQuery(api.matches.verifyCoachPin, {});

  if (coachData === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600">Coachdashboard laden...</p>
      </main>
    );
  }

  if (coachData === null) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-dia-green text-white p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">DIA Wedstrijduitslagen Live</h1>
              <p className="text-sm text-white/80">Coach toegang</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Geen coachtoegang</h2>
            <p className="text-sm text-gray-600">
              Dit account heeft geen actieve coach-rol of is nog niet gekoppeld aan een team.
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
        </div>
      </main>
    );
  }

  return (
    <CoachDashboard
      data={coachData}
      onLogout={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
