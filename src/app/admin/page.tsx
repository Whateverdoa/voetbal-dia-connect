"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [message, setMessage] = useState("");

  const clubs = useQuery(api.admin.listClubs);
  const coaches = useQuery(api.admin.listCoaches);
  const seedDIA = useMutation(api.admin.seedDIA);
  const seedMatches = useMutation(api.admin.seedMatches);

  const handleSeed = async () => {
    try {
      const result = await seedDIA();
      setMessage(
        `✅ ${result.message}. Default PIN: ${result.defaultPin || "1234"}`
      );
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleSeedMatches = async () => {
    try {
      const result = await seedMatches();
      setMessage(
        `✅ ${result.message}\n${result.matches.map((m: any) => 
          `${m.date.slice(0,10)} - ${m.opponent} (${m.code})${m.result ? ` → ${m.result}` : ''}`
        ).join('\n')}`
      );
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <header className="mb-8">
        <Link href="/" className="text-dia-green hover:underline text-sm">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold mt-2">Admin</h1>
      </header>

      {/* Seed data */}
      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Setup</h2>
        <p className="text-sm text-gray-600 mb-4">
          Seed DIA club met JO12-1 team en sample spelers.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSeed}
            className="px-4 py-2 bg-dia-green text-white rounded-lg hover:bg-green-700"
          >
            1. Seed DIA Data
          </button>
          <button
            onClick={handleSeedMatches}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            2. Seed Wedstrijden
          </button>
        </div>
        {message && (
          <pre className="mt-3 text-sm p-2 bg-gray-100 rounded whitespace-pre-wrap">{message}</pre>
        )}
      </section>

      {/* Clubs */}
      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Clubs</h2>
        {clubs === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : clubs.length === 0 ? (
          <p className="text-gray-500">Geen clubs. Klik op Seed DIA Data.</p>
        ) : (
          <ul className="space-y-2">
            {clubs.map((club) => (
              <li
                key={club._id}
                className="flex justify-between items-center p-2 bg-gray-50 rounded"
              >
                <span className="font-medium">{club.name}</span>
                <span className="text-sm text-gray-500 font-mono">
                  {club.slug}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coaches */}
      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Coaches</h2>
        {coaches === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : coaches.length === 0 ? (
          <p className="text-gray-500">Geen coaches.</p>
        ) : (
          <ul className="space-y-2">
            {coaches.map((coach) => (
              <li
                key={coach._id}
                className="p-2 bg-gray-50 rounded"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{coach.name}</span>
                  <span className="text-sm text-gray-500">
                    PIN: <span className="font-mono">{coach.pin}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Teams: {coach.teams.map((t: any) => t.name).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add players form */}
      <AddPlayersSection clubs={clubs} />
    </main>
  );
}

function AddPlayersSection({ clubs }: { clubs: any[] | undefined }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState("");
  const [status, setStatus] = useState("");

  // Get first club's teams
  const firstClub = clubs?.[0];
  const teams = useQuery(
    api.admin.listTeamsByClub,
    firstClub ? { clubId: firstClub._id } : "skip"
  );
  const players = useQuery(
    api.admin.listPlayersByTeam,
    selectedTeamId ? { teamId: selectedTeamId as any } : "skip"
  );

  const createPlayers = useMutation(api.admin.createPlayers);

  const handleAddPlayers = async () => {
    if (!selectedTeamId || !playerNames.trim()) return;

    const names = playerNames
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    try {
      await createPlayers({
        teamId: selectedTeamId as any,
        players: names.map((name, i) => ({ name, number: i + 1 })),
      });
      setPlayerNames("");
      setStatus(`✅ ${names.length} spelers toegevoegd`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold mb-3">Spelers beheren</h2>

      {/* Team selector */}
      {teams && teams.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Team</label>
          <select
            value={selectedTeamId || ""}
            onChange={(e) => setSelectedTeamId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Selecteer team...</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current players */}
      {selectedTeamId && players && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">
            Huidige spelers ({players.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {players.map((p) => (
              <span
                key={p._id}
                className="text-xs px-2 py-1 bg-gray-100 rounded"
              >
                {p.number && `#${p.number} `}
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add new players */}
      {selectedTeamId && (
        <>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Nieuwe spelers (één per regel)
            </label>
            <textarea
              value={playerNames}
              onChange={(e) => setPlayerNames(e.target.value)}
              placeholder="Jan de Vries
Piet Jansen
Klaas Bakker"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          <button
            onClick={handleAddPlayers}
            disabled={!playerNames.trim()}
            className="px-4 py-2 bg-dia-green text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
          >
            Spelers toevoegen
          </button>
          {status && (
            <p className="mt-2 text-sm p-2 bg-gray-100 rounded">{status}</p>
          )}
        </>
      )}
    </section>
  );
}
