"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function NewMatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pin = searchParams.get("pin") || "";
  const teamId = searchParams.get("teamId") as Id<"teams"> | null;

  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [quarterCount, setQuarterCount] = useState(4);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const players = useQuery(
    api.admin.listPlayersByTeam,
    teamId ? { teamId } : "skip"
  );
  const team = useQuery(api.admin.getTeam, teamId ? { teamId } : "skip");

  const createMatch = useMutation(api.matchActions.create);

  const handleTogglePlayer = (playerId: string) => {
    const newSet = new Set(selectedPlayers);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setSelectedPlayers(newSet);
  };

  const handleSelectAll = () => {
    if (players) {
      const allActive = players.filter((p) => p.active).map((p) => p._id);
      setSelectedPlayers(new Set(allActive));
    }
  };

  const handleCreate = async () => {
    if (!teamId || !opponent || selectedPlayers.size === 0) return;

    setIsCreating(true);
    try {
      const result = await createMatch({
        teamId,
        opponent,
        isHome,
        coachPin: pin,
        quarterCount,
        playerIds: Array.from(selectedPlayers) as Id<"players">[],
      });

      router.push(`/coach/match/${result.matchId}?pin=${pin}`);
    } catch (error) {
      console.error("Failed to create match:", error);
      setIsCreating(false);
    }
  };

  if (!teamId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Geen team geselecteerd</p>
          <Link href="/coach" className="text-dia-green hover:underline">
            ← Terug naar dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="bg-dia-green text-white p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/coach?pin=${pin}`}
            className="text-sm opacity-75 hover:opacity-100"
          >
            ← Terug
          </Link>
          <h1 className="text-xl font-bold mt-2">Nieuwe wedstrijd</h1>
          {team && <p className="text-sm opacity-75">{team.name}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Match details */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Wedstrijd details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tegenstander
              </label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="bijv. FC Groene Ster"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-dia-green focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Locatie
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsHome(true)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    isHome
                      ? "border-dia-green bg-green-50 text-dia-green"
                      : "border-gray-200"
                  }`}
                >
                  🏠 Thuis
                </button>
                <button
                  onClick={() => setIsHome(false)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    !isHome
                      ? "border-dia-green bg-green-50 text-dia-green"
                      : "border-gray-200"
                  }`}
                >
                  🚌 Uit
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Speelwijze
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuarterCount(4)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    quarterCount === 4
                      ? "border-dia-green bg-green-50 text-dia-green"
                      : "border-gray-200"
                  }`}
                >
                  4 kwarten
                </button>
                <button
                  onClick={() => setQuarterCount(2)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    quarterCount === 2
                      ? "border-dia-green bg-green-50 text-dia-green"
                      : "border-gray-200"
                  }`}
                >
                  2 helften
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Player selection */}
        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">
              Selectie ({selectedPlayers.size} spelers)
            </h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-dia-green hover:underline"
            >
              Selecteer alle
            </button>
          </div>

          {players === undefined ? (
            <p className="text-gray-500">Laden...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-500">Geen spelers in dit team</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {players
                .filter((p) => p.active)
                .sort((a, b) => (a.number || 99) - (b.number || 99))
                .map((player) => (
                  <button
                    key={player._id}
                    onClick={() => handleTogglePlayer(player._id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedPlayers.has(player._id)
                        ? "border-dia-green bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                          selectedPlayers.has(player._id)
                            ? "bg-dia-green text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {player.number || "?"}
                      </span>
                      <span className="font-medium text-sm">{player.name}</span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </section>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!opponent || selectedPlayers.size === 0 || isCreating}
          className="w-full py-4 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? "Aanmaken..." : "Wedstrijd aanmaken"}
        </button>
      </div>
    </main>
  );
}
