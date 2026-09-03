"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activeSeasonKey } from "@/lib/season";

/** Map of playerId → season total minutes for the active season. */
export function useSeasonMinutesMap(
  teamId: Id<"teams"> | undefined
): Map<string, number> {
  const seasonKey = activeSeasonKey();
  const data = useQuery(
    api.playingTimeSeason.getTeamSeasonPlayingTime,
    teamId ? { teamId, seasonKey } : "skip"
  );

  return useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const player of data.players) {
      map.set(String(player.playerId), player.totalMinutes);
    }
    return map;
  }, [data]);
}
