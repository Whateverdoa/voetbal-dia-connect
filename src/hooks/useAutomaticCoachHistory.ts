"use client";

import { useEffect, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { amsterdamDay, automaticHistoryMatch } from "@/lib/coachAssistant/automaticHistory";
import { validDate } from "@/lib/coachAssistant/history";
import type { AssistantHistoryMatch } from "@/lib/coachAssistant/types";

/** Existing read-only endpoints; at most four historical match requests run together. */
export function useAutomaticCoachHistory(teamId: Id<"teams">, targetDate: string) {
  const client = useConvex();
  const rows = useQuery(api.teams.getMatchHistory, { teamId });
  const ids = JSON.stringify((rows ?? []).filter((row) => {
    const timestamp = row.scheduledAt ?? row.finishedAt;
    return timestamp && (!validDate(targetDate) || amsterdamDay(timestamp) < targetDate);
  }).map((row) => row.id));
  const ready = rows !== undefined;
  const scope = `${teamId}:${targetDate}:${ids}`;
  const [result, setResult] = useState<{ scope: string; matches: AssistantHistoryMatch[]; warnings: string[] } | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const matchIds = JSON.parse(ids) as Id<"matches">[];
    async function load() {
      const matches: AssistantHistoryMatch[] = [];
      const warnings: string[] = [];
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, matchIds.length) }, async () => {
        while (!cancelled && next < matchIds.length) {
          const matchId = matchIds[next++];
          try {
            const detail = await client.query(api.matches.getForCoach, { matchId });
            if (!detail || detail.teamId !== teamId) { warnings.push("Een bronwedstrijd kon niet met jouw coachtoegang worden gelezen."); continue; }
            const converted = automaticHistoryMatch(detail);
            if (converted.match && (!validDate(targetDate) || converted.match.date < targetDate)) matches.push(converted.match);
            warnings.push(...converted.warnings);
          } catch {
            warnings.push("Een bronwedstrijd kon niet worden geladen. De overige beschikbare wedstrijden zijn wel meegenomen.");
          }
        }
      }));
      if (!cancelled) setResult({ scope, matches: matches.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), warnings: [...new Set(warnings)] });
    }
    void load();
    return () => { cancelled = true; };
  }, [client, ids, ready, scope, targetDate, teamId]);

  return result?.scope === scope ? { matches: result.matches, warnings: result.warnings, loading: false }
    : { matches: [] as AssistantHistoryMatch[], warnings: [] as string[], loading: true };
}
