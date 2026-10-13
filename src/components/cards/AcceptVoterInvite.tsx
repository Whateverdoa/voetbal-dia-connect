"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authPageUrl } from "@/lib/auth/returnTo";
import { cardButtonClass, cardError } from "@/components/cards/cardUi";

export function AcceptVoterInvite({ teamSlug, token }: { teamSlug: string; token: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const accept = useMutation(api.playerCards.acceptInvite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const returnTo = `/team/${encodeURIComponent(teamSlug)}/app/invite/${encodeURIComponent(token)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-dia-green">DIA · Teamuitnodiging</p>
        <h1 className="text-2xl font-bold text-slate-900">Welkom bij je team</h1>
        <p className="text-sm text-slate-600">Koppel je account om de spelerskaarten te bekijken en mee te stemmen. Gebruik precies het e-mailadres waarvoor je coach deze uitnodiging heeft gemaakt.</p>
        {isLoading ? <p className="text-sm text-slate-600">Account laden…</p> : isAuthenticated ? (
          <button type="button" disabled={pending} className={`${cardButtonClass} w-full`} onClick={() => {
            setPending(true);
            setError("");
            void accept({ token }).then((result) => router.replace(`/team/${encodeURIComponent(result.teamSlug)}/app`), (cause: unknown) => setError(cardError(cause))).finally(() => setPending(false));
          }}>{pending ? "Koppelen…" : "Uitnodiging accepteren"}</button>
        ) : <div className="flex flex-wrap gap-3"><Link href={authPageUrl("sign-in", returnTo)} className={`${cardButtonClass} inline-flex items-center`}>Inloggen</Link><Link href={authPageUrl("sign-up", returnTo)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700">Account maken</Link></div>}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <p className="text-xs text-slate-500">De uitnodiging is zeven dagen geldig. Is de link verlopen of ingetrokken? Vraag je coach om een nieuwe link.</p>
      </section>
    </main>
  );
}
