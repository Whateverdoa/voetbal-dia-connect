"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RefereeOpenMatchCard } from "./RefereeOpenMatchCard";

type Tab = "beschikbaar" | "mijn" | "meldingen";

interface AssignedMatch {
  id: string;
  opponent: string;
  isHome: boolean;
  status: string;
  scheduledAt?: number;
  teamName: string;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefereeDashboard({
  refereeName,
  assignedMatches,
  onLogout,
}: {
  refereeName: string;
  assignedMatches: AssignedMatch[];
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("beschikbaar");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const eligible = useQuery(api.refereePool.listEligibleOpenMatches, {});
  const notifications = useQuery(api.refereeNotifications.listMyNotifications, {});
  const claimMatch = useMutation(api.refereePool.claimMatch);
  const releaseMatch = useMutation(api.refereePool.releaseMatch);
  const markRead = useMutation(api.refereeNotifications.markNotificationRead);
  const markAllRead = useMutation(api.refereeNotifications.markAllNotificationsRead);

  const unread = notifications?.unreadCount ?? 0;
  const openCount = eligible?.matches?.length ?? 0;

  async function handleClaim(matchId: Id<"matches">) {
    setBusyId(matchId);
    setError("");
    try {
      await claimMatch({ matchId });
      setTab("mijn");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claimen mislukt");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRelease(matchId: Id<"matches">) {
    setBusyId(matchId);
    setError("");
    try {
      await releaseMatch({ matchId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loslaten mislukt");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      <nav className="bg-gray-800 text-white px-4 py-2 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="text-sm opacity-80 hover:opacity-100 min-h-[44px] px-2 -ml-2"
          >
            ← Uitloggen
          </button>
          <span className="bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Scheidsrechter
          </span>
        </div>
      </nav>

      <header className="bg-dia-black p-6 text-white text-center">
        <p className="text-sm opacity-80">Welkom</p>
        <h1 className="text-2xl font-bold">{refereeName}</h1>
        <p className="text-sm opacity-80 mt-1">
          {eligible?.isWindowOpen ? "Claimronde is open" : "Geen open claimronde"}
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1 shadow-sm">
          {(
            [
              ["beschikbaar", `Beschikbaar${openCount ? ` (${openCount})` : ""}`],
              ["mijn", "Mijn wedstrijden"],
              ["meldingen", `Meldingen${unread ? ` (${unread})` : ""}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-[44px] rounded-xl px-2 text-xs font-semibold ${
                tab === key
                  ? "bg-dia-green text-black"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {tab === "beschikbaar" && (
          <>
            {eligible === undefined && (
              <p className="text-sm text-gray-500 text-center">Laden…</p>
            )}
            {eligible && !eligible.isWindowOpen && (
              <div className="bg-white rounded-xl shadow-md p-6 text-center space-y-2">
                <p className="text-gray-600">Er is nu geen open claimronde.</p>
                <p className="text-sm text-gray-400">
                  Zodra de club de ronde opent, zie je hier passende wedstrijden.
                </p>
              </div>
            )}
            {eligible?.isWindowOpen && eligible.matches.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 text-center space-y-2">
                <p className="text-gray-600">Geen passende open wedstrijden.</p>
                <p className="text-sm text-gray-400">
                  Check je kwalificatietags bij de club, of kijk later opnieuw.
                </p>
              </div>
            )}
            {eligible?.matches.map((match) => (
              <RefereeOpenMatchCard
                key={match.id}
                match={match}
                busy={busyId === match.id}
                onClaim={() => void handleClaim(match.id)}
              />
            ))}
          </>
        )}

        {tab === "mijn" && (
          <>
            {assignedMatches.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6 text-center space-y-2">
                <p className="text-gray-500">Nog geen wedstrijden toegewezen.</p>
                <p className="text-sm text-gray-400">
                  Claim er één onder Beschikbaar, of vraag de admin.
                </p>
              </div>
            ) : (
              assignedMatches.map((match) => (
                <div key={match.id} className="rounded-xl bg-white shadow-md overflow-hidden">
                  <a
                    href={`/scheidsrechter/match/${match.id}`}
                    className="block px-4 py-4"
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {formatDate(match.scheduledAt)} · {match.status}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {match.isHome ? match.teamName : match.opponent} vs{" "}
                      {match.isHome ? match.opponent : match.teamName}
                    </p>
                    <p className="text-xs text-dia-black mt-2">Tik om te openen →</p>
                  </a>
                  {match.status === "scheduled" && (
                    <button
                      type="button"
                      disabled={busyId === match.id}
                      onClick={() =>
                        void handleRelease(match.id as Id<"matches">)
                      }
                      className="w-full min-h-[44px] border-t border-slate-100 text-sm font-semibold text-slate-600 disabled:opacity-60"
                    >
                      Wedstrijd loslaten
                    </button>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {tab === "meldingen" && (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void markAllRead({})}
                className="text-sm font-semibold text-dia-black min-h-[44px] px-2"
              >
                Alles gelezen
              </button>
            </div>
            {notifications === undefined && (
              <p className="text-sm text-gray-500 text-center">Laden…</p>
            )}
            {notifications?.notifications.length === 0 && (
              <p className="text-sm text-gray-500 text-center">Geen meldingen.</p>
            )}
            {notifications?.notifications.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => void markRead({ notificationId: n._id })}
                className={`w-full text-left rounded-xl border px-4 py-3 ${
                  n.readAt
                    ? "border-slate-200 bg-white text-slate-600"
                    : "border-dia-yellow-deep/40 bg-dia-green-light text-slate-900"
                }`}
              >
                <p className="text-sm font-medium">{n.body}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
