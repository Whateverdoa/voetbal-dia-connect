"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { linkUserRoleWithPin, setUserRole, tryBootstrapCoach } from "./actions";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [isLinkPending, startLinkTransition] = useTransition();
  const [isLinkedLocally, setIsLinkedLocally] = useState(false);

  const currentRole = useMemo(() => {
    const rawRole = user?.publicMetadata?.role;
    return typeof rawRole === "string" ? rawRole : null;
  }, [user?.publicMetadata?.role]);

  let hasLinkedRecord = false;
  if (currentRole) {
    if (isLinkedLocally) {
      hasLinkedRecord = true;
    } else if (user?.publicMetadata) {
      if (currentRole === "coach") {
        hasLinkedRecord = typeof user.publicMetadata.linkedCoachId === "string";
      } else if (currentRole === "referee") {
        hasLinkedRecord =
          typeof user.publicMetadata.linkedRefereeId === "string";
      } else {
        hasLinkedRecord = user.publicMetadata.linkedAdmin === true;
      }
    }
  }

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

      if (role === "coach") {
        const bootstrap = await tryBootstrapCoach();
        if (bootstrap.linked) {
          setIsLinkedLocally(true);
          setSuccessMessage("Account gekoppeld aan coach (geen PIN nodig). Je kunt naar het coach-dashboard.");
          router.push("/coach");
          return;
        }
      }

      setSuccessMessage(
        "Rol opgeslagen. Koppel nu je bestaande account met je PIN."
      );
    });
  };

  const handleLinkWithPin = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startLinkTransition(async () => {
      const result = await linkUserRoleWithPin(pinInput);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Koppelen mislukt.");
        return;
      }

      setIsLinkedLocally(true);
      setPinInput("");
      setSuccessMessage(
        "Account gekoppeld. Je gaat nu naar het coach-dashboard."
      );
      if (currentRole === "coach") {
        router.push("/coach");
        return;
      }
      if (currentRole === "referee") {
        router.push("/scheidsrechter");
        return;
      }
      if (currentRole === "admin") {
        router.push("/admin");
        return;
      }
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-5">
        <h1 className="text-2xl font-bold text-dia-green">Kies je rol</h1>
        <p className="text-sm text-gray-600">
          Je account is aangemaakt, maar heeft nog geen rol. Kies hieronder hoe je deze app gebruikt.
        </p>

        {currentRole && hasLinkedRecord ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Je rol is ingesteld op <strong>{currentRole}</strong> en je account is gekoppeld.
            </p>
            <div className="mt-3">
              <Link href="/" className="text-sm font-medium text-green-800 hover:underline">
                Naar startpagina
              </Link>
            </div>
          </div>
        ) : currentRole ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm text-amber-800">
              Rol ingesteld op <strong>{currentRole}</strong>. Koppel nu met je bestaande{" "}
              {currentRole === "coach"
                ? "coach"
                : currentRole === "referee"
                  ? "scheidsrechter"
                  : "admin"}{" "}
              PIN.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                inputMode="numeric"
                placeholder="PIN (4-6 cijfers)"
                value={pinInput}
                onChange={(event) => setPinInput(event.target.value)}
                className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm"
                maxLength={6}
              />
              <button
                type="button"
                onClick={handleLinkWithPin}
                disabled={isLinkPending || pinInput.trim().length < 4}
                className="rounded-lg bg-dia-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLinkPending ? "Koppelen..." : "Koppel met PIN"}
              </button>
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
