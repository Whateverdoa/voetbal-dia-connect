"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { parseRolesFromMetadata } from "@/lib/auth/roles";
import {
  bootstrapFullAccessIfEligible,
  bootstrapRoleLinksFromEmail,
} from "./actions";

type UserRole = "admin" | "coach" | "referee";

type ResolveStatus = "resolving" | "noRole";

function getPreferredRoute(roles: UserRole[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("coach")) return "/coach";
  if (roles.includes("referee")) return "/scheidsrechter";
  return "/";
}

export function RoleOnboardingClient() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<ResolveStatus>("resolving");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentRoles = useMemo(() => {
    const parsed = parseRolesFromMetadata(user?.publicMetadata);
    return parsed.filter(
      (role): role is UserRole =>
        role === "admin" || role === "coach" || role === "referee"
    );
  }, [user?.publicMetadata]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const runBootstrap = async () => {
      if (currentRoles.length > 0) {
        router.replace(getPreferredRoute(currentRoles));
        return;
      }

      const adminBootstrap = await bootstrapFullAccessIfEligible();
      if (cancelled) return;
      if (adminBootstrap.applied) {
        router.replace("/admin");
        return;
      }

      const roleBootstrap = await bootstrapRoleLinksFromEmail();
      if (cancelled) return;
      if (roleBootstrap.applied) {
        router.replace(getPreferredRoute(roleBootstrap.assignedRoles));
        return;
      }

      setStatus("noRole");
    };

    void runBootstrap().catch(() => {
      if (cancelled) return;
      setErrorMessage(
        "Rolkoppeling mislukt. Probeer opnieuw of neem contact op met een admin."
      );
      setStatus("noRole");
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, currentRoles, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 space-y-5">
        <h1 className="text-2xl font-bold text-dia-green">Account koppelen</h1>
        <p className="text-sm text-gray-600">
          We koppelen je account automatisch op basis van je e-mailadres en bestaande gegevens
          in DIA Live.
        </p>

        {status === "resolving" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Rollen worden opgehaald en gekoppeld. Een moment geduld...
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm text-amber-800">
              Voor dit e-mailadres is nog geen toegang gevonden.
            </p>
            <p className="text-sm text-amber-800">
              Neem contact op met een admin om je e-mailadres te koppelen aan coach- of
              scheidsrechterrechten.
            </p>
            <button
              type="button"
              onClick={() => {
                void signOut({ redirectUrl: "/" });
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-900"
            >
              Uitloggen
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="ml-2 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {errorMessage ? (
          <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
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
