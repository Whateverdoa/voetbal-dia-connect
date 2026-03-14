"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { MatchCreatedSuccess } from "@/components/MatchCreatedSuccess";
import { PlayerSelectionGrid } from "@/components/PlayerSelectionGrid";
import {
  CreateMatchFooter,
  MatchDetailsForm,
} from "@/components/coach/NewMatchFormSections";

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
  const [quarterCount, setQuarterCount] = useState(4);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMatch, setCreatedMatch] = useState<{
    matchId: string;
    publicCode: string;
  } | null>(null);

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

  const handleDeselectAll = () => {
    setSelectedPlayers(new Set());
  };

  const handleCreate = async () => {
    // Client-side validation
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
      const result = await createMatch({
        teamId,
        opponent: trimmedOpponent,
        isHome,
        quarterCount,
        playerIds: Array.from(selectedPlayers) as Id<"players">[],
      });

      setCreatedMatch({
        matchId: result.matchId,
        publicCode: result.publicCode,
      });
    } catch (err) {
      console.error("Failed to create match:", err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      // Translate common errors to Dutch
      if (message.includes("unieke wedstrijdcode")) {
        setError("Kon geen unieke wedstrijdcode genereren. Probeer het opnieuw.");
      } else if (message.includes("Tegenstander")) {
        setError(message);
      } else if (message.includes("speler")) {
        setError(message);
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
          quarterCount={quarterCount}
          setQuarterCount={setQuarterCount}
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
