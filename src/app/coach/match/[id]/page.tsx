"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { MatchLoadingScreen, MatchErrorScreen } from "@/components/match";
import type { Match, MatchPlayer, MatchEvent } from "@/components/match";
import { MatchControlPanel } from "@/components/coach/MatchControlPanel";

export default function CoachMatchPage() {
  const params = useParams();
  const matchIdParam = params.id;
  const matchId =
    typeof matchIdParam === "string"
      ? (matchIdParam as Id<"matches">)
      : null;

  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastDataRef = useRef<typeof match>(undefined);

  const match = useQuery(
    api.matches.getForCoach,
    matchId ? { matchId } : "skip",
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (lastDataRef.current !== undefined && match === undefined) {
          setIsReconnecting(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [match]);

  useEffect(() => {
    if (match !== undefined) {
      lastDataRef.current = match;
      setIsReconnecting(false);
    }
  }, [match]);

  if (!matchId) {
    return (
      <MatchErrorScreen
        message="Ongeldige wedstrijdlink"
        backHref="/coach"
      />
    );
  }

  if (match === undefined) {
    return <MatchLoadingScreen isReconnecting={isReconnecting} />;
  }

  if (match === null) {
    return (
      <MatchErrorScreen
        message="Wedstrijd niet gevonden of je hebt geen toegang tot deze wedstrijd"
        backHref="/coach"
      />
    );
  }

  const typedMatch: Match = {
    ...match,
    players: match.players as MatchPlayer[],
    events: match.events as MatchEvent[],
  };

  return <MatchControlPanel match={typedMatch} />;
}
