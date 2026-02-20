"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  MatchLoadingScreen,
  MatchErrorScreen,
} from "@/components/match";
import type { Match, MatchPlayer, MatchEvent } from "@/components/match";
import { MatchControlPanel } from "@/components/coach/MatchControlPanel";
export default function CoachMatchPage() {
  return (
    <Suspense fallback={<MatchLoadingScreen />}>
      <CoachMatchContent />
    </Suspense>
  );
}

function CoachMatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as Id<"matches">;
  const pin = searchParams.get("pin") || "";

  // Track connection state for visibility change handling
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastDataRef = useRef<typeof match>(undefined);

  const match = useQuery(api.matches.getForCoach, { matchId, pin });

  // Handle visibility change (mobile tab sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible - check if we need to show reconnecting state
        if (lastDataRef.current !== undefined && match === undefined) {
          setIsReconnecting(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [match]);

  // Update refs and clear reconnecting state when data arrives
  useEffect(() => {
    if (match !== undefined) {
      lastDataRef.current = match;
      setIsReconnecting(false);
    }
  }, [match]);

  if (match === undefined) {
    return <MatchLoadingScreen isReconnecting={isReconnecting} />;
  }

  if (match === null) {
    return (
      <MatchErrorScreen
        message="Wedstrijd niet gevonden of ongeldige PIN"
        backHref={`/coach?pin=${pin}`}
      />
    );
  }

  // Type the match data properly
  const typedMatch: Match = {
    ...match,
    players: match.players as MatchPlayer[],
    events: match.events as MatchEvent[],
  };

  return <MatchControlPanel match={typedMatch} pin={pin} />;
}
