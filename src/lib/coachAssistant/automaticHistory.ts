import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { AssistantHistoryMatch } from "./types";
import { FORMATIONS } from "../formations";

export type HistoricalCoachMatch = Pick<NonNullable<FunctionReturnType<typeof api.matches.getForCoach>>,
  "_id" | "teamId" | "opponent" | "status" | "scheduledAt" | "startedAt" | "finishedAt" | "frozenClockMs" |
  "regulationDurationMinutes" | "events" | "players" | "customFormationTemplate" | "formationId">;

export function amsterdamDay(timestamp: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
}

/** Keep recorded minutes distinct from unknown keeper splits and missing kickoff positions. */
export function automaticHistoryMatch(match: HistoricalCoachMatch): { match: AssistantHistoryMatch | null; warnings: string[] } {
  if (match.status !== "finished") return { match: null, warnings: [] };
  const timestamp = match.scheduledAt ?? match.startedAt ?? match.finishedAt;
  if (!timestamp || !Number.isFinite(timestamp)) return { match: null, warnings: [`${match.opponent}: wedstrijddatum ontbreekt.`] };
  const warnings: string[] = [];
  const recordedClock = match.frozenClockMs ?? Math.max(0, ...match.events.filter((event) => event.type === "quarter_end").map((event) => event.matchMs ?? 0));
  const duration = recordedClock > 0 ? Math.round(recordedClock / 6000) / 10 : match.regulationDurationMinutes ?? 0;
  if (!duration) warnings.push(`${match.opponent}: speelduur ontbreekt; minuten worden nog niet meegewogen.`);
  let invalidMinutes = false;
  const formation = match.customFormationTemplate ?? (match.formationId ? FORMATIONS[match.formationId] : undefined);
  const players = match.players.filter((player) => player !== null).map((player) => {
    // The legacy query defaults missing minutes to 0. An unproven zero stays unknown.
    const registered = Number.isFinite(player.minutesPlayed) && player.minutesPlayed > 0;
    const minutes = registered && duration > 0 && player.minutesPlayed <= duration ? player.minutesPlayed : null;
    if (registered && minutes === null) invalidMinutes = true;
    return { playerKey: String(player.playerId), name: player.name,
      recordedPosition: player.onField ? formation?.slots.find((slot) => slot.id === player.fieldSlotIndex)?.position ?? null : "BENCH",
      attendance: registered ? "present" as const : player.absent || player.injured ? "absent" as const : "unknown" as const,
      minutes, keeperMinutes: null, startingPosition: null };
  });
  if (invalidMinutes) warnings.push(`${match.opponent}: speelminuten buiten de geregistreerde wedstrijdduur zijn uitgesloten.`);
  if (!players.length) warnings.push(`${match.opponent}: geen spelers- of minutengegevens opgeslagen.`);
  return { warnings, match: { id: String(match._id), source: "dia_live", teamKey: String(match.teamId), date: amsterdamDay(timestamp), opponent: match.opponent,
    playingDuration: duration, confirmed: true, startingLineupConfirmed: false, players } };
}
