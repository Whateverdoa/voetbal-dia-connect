"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { setUserRole } from "./actions";

type UserRole = "admin" | "coach" | "referee";

const roleCards: Array<{
  id: UserRole;
  title: string;
  description: string;
}> = [
  {
    id: "coach",
    title: "Coach",
    description: "Toegang tot coach dashboard, opstelling en wedstrijdbediening.",
  },
  {
    id: "referee",
    title: "Scheidsrechter",
    description: "Toegang tot scheidsrechter scherm voor klok en score.",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Volledige beheerrechten (alleen bootstrap-admins).",
  },
];

export function RoleOnboardingClient() {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const currentRole = useMemo(() => {
    const rawRole = user?.publicMetadata?.role;
    return typeof rawRole === "string" ? rawRole : null;
  }, [user?.publicMetadata?.role]);

  const handleSelectRole = (role: UserRole) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedRole(role);

    startTransition(async () => {
      const result = await setUserRole(role);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Rol instellen mislukt.");
        return;
      }

      setSuccessMessage(
        "Rol opgeslagen. Log opnieuw in (of ververs) om direct de juiste toegang te krijgen."
      );
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-5">
        <h1 className="text-2xl font-bold text-dia-green">Kies je rol</h1>
        <p className="text-sm text-gray-600">
          Je account is aangemaakt, maar heeft nog geen rol. Kies hieronder hoe je deze app gebruikt.
        </p>

        {currentRole ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Je rol is al ingesteld op <strong>{currentRole}</strong>.
            </p>
            <div className="mt-3">
              <Link href="/" className="text-sm font-medium text-green-800 hover:underline">
                Naar startpagina
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {roleCards.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                disabled={isPending}
                className={`rounded-lg border p-4 text-left transition-colors min-h-[120px] ${
                  selectedRole === role.id
                    ? "border-dia-green bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <p className="font-semibold text-gray-900">{role.title}</p>
                <p className="mt-2 text-xs text-gray-600">{role.description}</p>
              </button>
            ))}
          </div>
        )}

        {errorMessage ? (
          <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-green-700 font-medium">{successMessage}</p>
        ) : null}

        <div className="pt-2">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Terug naar start
          </Link>
        </div>
      </div>
    </main>
  );
}
