"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { MatchCreatedSuccess } from "@/components/MatchCreatedSuccess";
import { PlayerSelectionGrid } from "@/components/PlayerSelectionGrid";
import { MatchTimingPresetPicker } from "@/components/match/MatchTimingPresetPicker";
import {
  MATCH_TIMING_PRESETS,
  type MatchTimingPresetId,
} from "@/lib/matchTimingPresets";

export default function NewMatchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <NewMatchContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-dia-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Laden...</p>
      </div>
    </main>
  );
}

function NewMatchContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") as Id<"teams"> | null;

  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [timingPreset, setTimingPreset] = useState<MatchTimingPresetId>("q4_15");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMatch, setCreatedMatch] = useState<{
    matchId: string;
    publicCode: string;
  } | null>(null);

  const teamSetup = useQuery(
    api.matches.getCoachTeamSetup,
    teamId ? { teamId } : "skip"
  );
  const createMatch = useMutation(api.matchActions.create);

  const players = teamSetup?.players;
  const team = teamSetup?.team;

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

  const handleDeselectAll = () => {
    setSelectedPlayers(new Set());
  };

  const handleCreate = async () => {
    const trimmedOpponent = opponent.trim();
    if (!teamId) {
      setError("Geen team geselecteerd");
      return;
    }
    if (!trimmedOpponent) {
      setError("Vul de naam van de tegenstander in");
      return;
    }
    if (selectedPlayers.size === 0) {
      setError("Selecteer minimaal één speler");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const timing = MATCH_TIMING_PRESETS[timingPreset];
      const result = await createMatch({
        teamId,
        opponent: trimmedOpponent,
        isHome,
        quarterCount: timing.quarterCount,
        regulationDurationMinutes: timing.regulationDurationMinutes,
        playerIds: Array.from(selectedPlayers) as Id<"players">[],
      });

      setCreatedMatch({
        matchId: result.matchId,
        publicCode: result.publicCode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      if (message.includes("unieke wedstrijdcode")) {
        setError("Kon geen unieke wedstrijdcode genereren. Probeer het opnieuw.");
      } else {
        setError(`Fout bij aanmaken: ${message}`);
      }
      setIsCreating(false);
    }
  };

  if (createdMatch) {
    return (
      <MatchCreatedSuccess
        publicCode={createdMatch.publicCode}
        matchId={createdMatch.matchId}
        opponent={opponent}
      />
    );
  }

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

  if (teamSetup === undefined) {
    return <LoadingScreen />;
  }

  if (teamSetup === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm border border-gray-200">
          <p className="text-red-600 font-medium">Je hebt geen toegang tot dit team.</p>
          <Link href="/coach" className="mt-4 inline-flex text-dia-green hover:underline">
            ← Terug naar dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="bg-dia-green text-white p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/coach"
            className="text-sm opacity-75 hover:opacity-100 min-h-[44px] inline-flex items-center"
          >
            ← Terug
          </Link>
          <h1 className="text-xl font-bold mt-1">Nieuwe wedstrijd</h1>
          {team && <p className="text-sm opacity-75">{team.name}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <MatchDetailsForm
          opponent={opponent}
          setOpponent={setOpponent}
          isHome={isHome}
          setIsHome={setIsHome}
          timingPreset={timingPreset}
          setTimingPreset={setTimingPreset}
        />

        <PlayerSelectionGrid
          players={players}
          selectedPlayers={selectedPlayers}
          onTogglePlayer={handleTogglePlayer}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      </div>

      <CreateMatchFooter
        opponent={opponent}
        selectedCount={selectedPlayers.size}
        isCreating={isCreating}
        error={error}
        onCreate={handleCreate}
      />
    </main>
  );
}

function MatchDetailsForm({
  opponent,
  setOpponent,
  isHome,
  setIsHome,
  timingPreset,
  setTimingPreset,
}: {
  opponent: string;
  setOpponent: (value: string) => void;
  isHome: boolean;
  setIsHome: (value: boolean) => void;
  timingPreset: MatchTimingPresetId;
  setTimingPreset: (value: MatchTimingPresetId) => void;
}) {
  return (
    <section className="bg-white rounded-xl shadow p-5">
      <h2 className="font-semibold text-lg mb-4">Wedstrijd details</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tegenstander
          </label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="bijv. FC Groene Ster"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-dia-green focus:outline-none text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Locatie
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsHome(true)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                isHome
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              🏠 Thuis
            </button>
            <button
              type="button"
              onClick={() => setIsHome(false)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                !isHome
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              🚌 Uit
            </button>
          </div>
        </div>

        <div>
          <MatchTimingPresetPicker value={timingPreset} onChange={setTimingPreset} compact />
        </div>
      </div>
    </section>
  );
}

function CreateMatchFooter({
  opponent,
  selectedCount,
  isCreating,
  error,
  onCreate,
}: {
  opponent: string;
  selectedCount: number;
  isCreating: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  const canCreate = opponent.trim() && selectedCount > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <button
          onClick={onCreate}
          disabled={!canCreate || isCreating}
          className="w-full py-4 bg-dia-green text-white font-semibold rounded-xl hover:bg-dia-green-light disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[56px] text-lg active:scale-[0.98]"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Aanmaken...
            </span>
          ) : (
            "Wedstrijd aanmaken"
          )}
        </button>

        {!canCreate && !error && (
          <p className="text-center text-sm text-gray-500 mt-2">
            {!opponent.trim() && selectedCount === 0
              ? "Vul tegenstander in en selecteer spelers"
              : !opponent.trim()
                ? "Vul de tegenstander in"
                : "Selecteer minimaal 1 speler"}
          </p>
        )}
      </div>
    </div>
  );
}
