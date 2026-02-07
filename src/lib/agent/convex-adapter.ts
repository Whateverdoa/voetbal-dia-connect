/**
 * Convex adapter — maps agent tool calls to Convex queries/mutations.
 * Uses ConvexHttpClient for server-side (API route) usage.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ToolName } from "./tools";

/** Player shape returned by getForCoach query */
interface CoachPlayer {
  playerId: Id<"players">;
  name: string;
  number?: number;
  onField: boolean;
  isKeeper: boolean;
  minutesPlayed?: number;
}

/** Match event shape */
interface CoachEvent {
  type: string;
  playerName?: string;
  quarter: number;
}

/**
 * Fuzzy name match — tolerant of voice-recognition spelling.
 * Matches "Jansen" to "Tim Jansen", "tim" to "Tim de Vries", etc.
 */
function findPlayer(
  players: CoachPlayer[],
  name: string,
  mustBeOnField?: boolean,
): CoachPlayer | undefined {
  const lower = name.toLowerCase().trim();
  if (!lower) return undefined;

  const filtered =
    mustBeOnField === true
      ? players.filter((p) => p.onField)
      : mustBeOnField === false
        ? players.filter((p) => !p.onField)
        : players;

  // Exact match first
  const exact = filtered.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact;

  // Partial / contains match
  return filtered.find((p) => {
    const pLower = p.name.toLowerCase();
    return pLower.includes(lower) || lower.includes(pLower.split(" ")[0]);
  });
}

/** List player names as comma-separated string (for error messages). */
function listNames(players: CoachPlayer[]): string {
  return players.map((p) => p.name).join(", ");
}

/**
 * Create an adapter that executes tool calls against Convex.
 * Returned object has one method per tool name defined in tools.ts.
 */
export function createConvexAdapter(
  convexUrl: string,
  matchId: string,
  pin: string,
) {
  const convex = new ConvexHttpClient(convexUrl);
  const id = matchId as Id<"matches">;

  /** Shorthand to fetch the current match state. */
  async function fetchMatch() {
    return convex.query(api.matches.getForCoach, { matchId: id, pin });
  }

  const handlers: Record<ToolName, (input: Record<string, unknown>) => Promise<string>> = {
    /* ──────────── Read state ──────────── */

    async get_match_state() {
      const match = await fetchMatch();
      if (!match) return "Wedstrijd niet gevonden.";

      const onField = (match.players as CoachPlayer[]).filter((p) => p.onField);
      const bench = (match.players as CoachPlayer[]).filter((p) => !p.onField);

      return JSON.stringify({
        score: `${match.homeScore}-${match.awayScore}`,
        status: match.status,
        quarter: match.currentQuarter,
        teamName: match.teamName,
        onField: onField.map((p) => p.name),
        bench: bench.map((p) => p.name),
        recentEvents: (match.events as CoachEvent[]).slice(-5).map((e) => ({
          type: e.type,
          player: e.playerName,
          quarter: e.quarter,
        })),
      });
    },

    /* ──────────── Goals ──────────── */

    async add_goal(input) {
      const match = await fetchMatch();
      if (!match) return "Wedstrijd niet gevonden.";

      const players = match.players as CoachPlayer[];
      const scorer = findPlayer(players, input.scorerName as string);
      if (!scorer) {
        return `Speler "${input.scorerName}" niet gevonden. Beschikbaar: ${listNames(players)}`;
      }

      let assistId: Id<"players"> | undefined;
      if (input.assistName) {
        const assister = findPlayer(players, input.assistName as string);
        assistId = assister?.playerId;
      }

      await convex.mutation(api.matchEvents.addGoal, {
        matchId: id,
        pin,
        playerId: scorer.playerId,
        assistPlayerId: assistId,
        isOwnGoal: (input.isOwnGoal as boolean) || false,
      });

      const updated = await fetchMatch();
      return `Doelpunt ${scorer.name}!${assistId ? ` Aangever: ${input.assistName}` : ""} Stand: ${updated?.homeScore}-${updated?.awayScore}`;
    },

    async add_opponent_goal() {
      await convex.mutation(api.matchEvents.addGoal, {
        matchId: id,
        pin,
        isOpponentGoal: true,
      });
      const updated = await fetchMatch();
      return `Tegendoelpunt. Stand: ${updated?.homeScore}-${updated?.awayScore}`;
    },

    /* ──────────── Substitutions ──────────── */

    async make_substitution(input) {
      const match = await fetchMatch();
      if (!match) return "Wedstrijd niet gevonden.";

      const players = match.players as CoachPlayer[];
      const playerOut = findPlayer(players, input.playerOutName as string, true);
      const playerIn = findPlayer(players, input.playerInName as string, false);

      if (!playerOut) {
        const onField = players.filter((p) => p.onField);
        return `"${input.playerOutName}" staat niet op het veld. Op veld: ${listNames(onField)}`;
      }
      if (!playerIn) {
        const bench = players.filter((p) => !p.onField);
        return `"${input.playerInName}" zit niet op de bank. Bank: ${listNames(bench)}`;
      }

      await convex.mutation(api.matchEvents.substitute, {
        matchId: id,
        pin,
        playerOutId: playerOut.playerId,
        playerInId: playerIn.playerId,
      });

      return `Wissel: ${playerOut.name} eruit, ${playerIn.name} erin.`;
    },

    /* ──────────── Corrections ──────────── */

    async undo_last() {
      // Not yet implemented in Convex — return helpful message
      return "Ongedaan maken is nog niet beschikbaar. Gebruik stand aanpassen om handmatig te corrigeren.";
    },

    async correct_score(input) {
      // Direct score correction requires a dedicated mutation — not yet available
      return `Pas de stand aan via de knoppen op het scherm (${input.homeScore}-${input.awayScore}).`;
    },

    /* ──────────── Match flow ──────────── */

    async next_quarter() {
      await convex.mutation(api.matchActions.nextQuarter, {
        matchId: id,
        pin,
      });
      const updated = await fetchMatch();
      if (updated?.status === "finished") return "Wedstrijd afgelopen!";
      if (updated?.status === "halftime") return "Rust!";
      return `Kwart ${updated?.currentQuarter} gestart.`;
    },

    async pause_match() {
      return "Pauzefunctie nog niet beschikbaar. Gebruik de knoppen op het scherm.";
    },

    async resume_match() {
      await convex.mutation(api.matchActions.resumeFromHalftime, {
        matchId: id,
        pin,
      });
      return "Wedstrijd hervat!";
    },

    /* ──────────── Playing time (Phase 4) ──────────── */

    async get_playing_time() {
      const data = await convex.query(api.matchQueries.getPlayingTime, {
        matchId: id,
        pin,
      });
      if (!data) return "Speeltijd niet beschikbaar.";

      const sorted = data.players.sort(
        (a, b) => a.minutesPlayed - b.minutesPlayed,
      );
      const lines = sorted.map(
        (p) =>
          `${p.name}: ${p.minutesPlayed} min ${p.onField ? "(veld)" : "(bank)"}${p.isKeeper ? " [keeper]" : ""}`,
      );
      return `Speeltijd (kwart ${data.currentQuarter}):\n${lines.join("\n")}`;
    },

    async suggest_substitutions() {
      const data = await convex.query(
        api.matchQueries.getSuggestedSubstitutions,
        { matchId: id, pin },
      );
      if (!data) return "Wisselvoorstellen niet beschikbaar.";

      if (data.suggestions.length === 0) {
        return "Geen wissels nodig — speeltijd is redelijk verdeeld.";
      }

      const lines = data.suggestions.map(
        (s) =>
          `${s.playerOut.name} eruit, ${s.playerIn.name} erin (${s.reason})`,
      );
      return `Wisselvoorstel:\n${lines.join("\n")}`;
    },
  };

  return handlers;
}
