import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { formatAssistLine } from "@/lib/assistKind";
import { describeGoalEvent } from "@/lib/goalEventText";

type CoachMatch = NonNullable<FunctionReturnType<typeof api.matches.getForCoach>>;
type CoachEvent = CoachMatch["events"][number];
type CoachPlayer = NonNullable<CoachMatch["players"][number]>;

export type MatchReportEvent = Pick<CoachEvent,
  "_id" | "type" | "quarter" | "timestamp" | "createdAt" | "playerId" | "relatedPlayerId" |
  "playerName" | "relatedPlayerName" | "assistKind" | "isOwnGoal" | "isOpponentGoal" |
  "isOpponentCard" | "note" | "displayMinute" | "displayExtraMinute" | "gameSecond" |
  "matchMs" | "correlationId" | "stagedEventId" | "targetEventId"
>;

/** The authenticated coach query already applies goal enrichments to goal rows. */
export type MatchReportSource = Pick<CoachMatch,
  "_id" | "teamName" | "opponent" | "isHome" | "scheduledAt" | "status" | "homeScore" | "awayScore" | "quarterCount"
> & {
  players: (Pick<CoachPlayer, "playerId" | "name" | "number" | "minutesPlayed"> | null)[];
  events: MatchReportEvent[];
};

export interface AfterMatchReport {
  matchId: string;
  teamName: string;
  opponent: string;
  homeTeam: string;
  awayTeam: string;
  isHome: boolean;
  scheduledAt: number | null;
  score: { home: number; away: number; team: number; opponent: number; label: string };
  summary: string;
  timeline: {
    id: string;
    type: "goal" | "assist" | "card" | "substitution" | "period";
    timeLabel: string;
    periodLabel: string;
    text: string;
    detail: string | null;
    note: string | null;
    playerIds: string[];
  }[];
  players: { playerId: string; name: string; number?: number; minutesPlayed: number | null; goals: number; assists: number; yellowCards: number; redCards: number }[];
  /** Apart from opponentGoals, counters concern the source team. */
  recorded: { teamGoals: number; opponentGoals: number; assists: number; substitutions: number; yellowCards: number; redCards: number };
  completenessNotes: string[];
}

type TimelineRow = AfterMatchReport["timeline"][number];
const finiteNonnegative = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value >= 0;
const usefulNote = (note?: string): string | null => note?.trim() && !/^Rugnummer:\s*\d+\s*$/i.test(note.trim()) ? note.trim() : null;

function gameTime(event: MatchReportEvent) {
  const seconds = finiteNonnegative(event.gameSecond) ? event.gameSecond : finiteNonnegative(event.matchMs) ? event.matchMs / 1000 : null;
  const minute = finiteNonnegative(event.displayMinute) ? event.displayMinute : seconds !== null ? Math.floor(seconds / 60) : null;
  const extra = finiteNonnegative(event.displayExtraMinute) ? event.displayExtraMinute : 0;
  return { minute, extra, seconds: minute !== null ? minute * 60 + extra * 60 : null, preciseSeconds: seconds };
}

function compareEvents(a: MatchReportEvent, b: MatchReportEvent) {
  if (a.quarter !== b.quarter) return a.quarter - b.quarter;
  const left = gameTime(a);
  const right = gameTime(b);
  const missingTimeOrder = (event: MatchReportEvent) => event.type === "quarter_start" ? -1 : Number.POSITIVE_INFINITY;
  const secondsDifference = (left.seconds ?? missingTimeOrder(a)) - (right.seconds ?? missingTimeOrder(b));
  if (secondsDifference && !Number.isNaN(secondsDifference)) return secondsDifference;
  const markerRank = (event: MatchReportEvent) => event.type === "quarter_start" ? -1 : event.type === "quarter_end" ? 1 : 0;
  return markerRank(a) - markerRank(b)
    || (left.preciseSeconds ?? 0) - (right.preciseSeconds ?? 0)
    || a.timestamp - b.timestamp || a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id));
}

/** A paired write shares its command identity, or its exact legacy event timestamp. */
function sameAction(a: MatchReportEvent, b: MatchReportEvent) {
  if (a.stagedEventId && b.stagedEventId) return a.stagedEventId === b.stagedEventId;
  if (a.correlationId && b.correlationId) return a.correlationId === b.correlationId;
  return a.quarter === b.quarter && a.timestamp === b.timestamp;
}

function substitutionPair(event: MatchReportEvent) {
  return event.type === "sub_in"
    ? { outId: event.relatedPlayerId, inId: event.playerId, outName: event.relatedPlayerName, inName: event.playerName }
    : { outId: event.playerId, inId: event.relatedPlayerId, outName: event.playerName, inName: event.relatedPlayerName };
}

export function buildMatchReport(source: MatchReportSource): AfterMatchReport | null {
  if (source.status !== "finished") return null;
  const homeTeam = source.isHome ? source.teamName : source.opponent;
  const awayTeam = source.isHome ? source.opponent : source.teamName;
  const score = {
    home: source.homeScore, away: source.awayScore,
    team: source.isHome ? source.homeScore : source.awayScore,
    opponent: source.isHome ? source.awayScore : source.homeScore,
    label: `${source.homeScore} – ${source.awayScore}`,
  };
  const players: AfterMatchReport["players"] = source.players.filter((player) => player !== null).map((player) => ({
    playerId: String(player.playerId), name: player.name, number: player.number,
    minutesPlayed: finiteNonnegative(player.minutesPlayed) ? player.minutesPlayed : null,
    goals: 0, assists: 0, yellowCards: 0, redCards: 0,
  })).sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }) || a.playerId.localeCompare(b.playerId));
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const named = (id?: string, name?: string) => name?.trim() || (id ? playerById.get(id)?.name : undefined);
  const events = [...source.events].sort(compareEvents);
  const goals = events.filter((event) => event.type === "goal");
  const assistByGoal = new Map<string, MatchReportEvent>();
  const linkedAssistIds = new Set<string>();
  for (const assist of events.filter((event) => event.type === "assist")) {
    const goal = goals.find((candidate) => assist.targetEventId === candidate._id)
      ?? goals.find((candidate) => assist.correlationId && candidate.correlationId === assist.correlationId)
      ?? goals.find((candidate) => !assistByGoal.has(String(candidate._id)) && sameAction(candidate, assist));
    if (goal) {
      linkedAssistIds.add(String(assist._id));
      if (!assistByGoal.has(String(goal._id))) assistByGoal.set(String(goal._id), assist);
    }
  }

  const recorded: AfterMatchReport["recorded"] = { teamGoals: 0, opponentGoals: 0, assists: 0, substitutions: 0, yellowCards: 0, redCards: 0 };
  const timeline: AfterMatchReport["timeline"] = [];
  const countedSubs: MatchReportEvent[] = [];
  const periodWord = source.quarterCount === 2 ? "Helft" : "Kwart";
  const countPlayer = (id: string | undefined, kind: "goals" | "assists" | "yellowCards" | "redCards") => {
    const player = id ? playerById.get(id) : undefined;
    if (player) player[kind] += 1;
  };
  let missingTimes = false;
  const add = (event: MatchReportEvent, type: TimelineRow["type"], text: string, detail: string | null = null, ids: (string | undefined)[] = [event.playerId], note = usefulNote(event.note)) => {
    const time = gameTime(event);
    const periodLabel = `${periodWord} ${event.quarter}`;
    if (time.minute === null) missingTimes = true;
    timeline.push({
      id: String(event._id), type, text, detail, note, periodLabel,
      timeLabel: time.minute === null ? periodLabel : `${time.minute}${time.extra > 0 ? `+${time.extra}` : ""}'`,
      playerIds: [...new Set(ids.filter((id): id is string => id !== undefined))],
    });
  };

  for (const event of events) {
    const playerName = named(event.playerId, event.playerName);
    if (event.type === "goal") {
      recorded[event.isOpponentGoal ? "opponentGoals" : "teamGoals"] += 1;
      const linkedAssist = assistByGoal.get(String(event._id));
      const assistId = event.relatedPlayerId ?? linkedAssist?.playerId;
      const assistName = named(assistId, event.relatedPlayerName ?? linkedAssist?.playerName);
      const assistKind = event.assistKind ?? linkedAssist?.assistKind;
      if (!event.isOpponentGoal && !event.isOwnGoal) {
        countPlayer(event.playerId, "goals");
        if (assistId || assistName) { recorded.assists += 1; countPlayer(assistId, "assists"); }
      }
      const detail = event.isOwnGoal ? null : formatAssistLine(assistName, assistKind);
      const notes = [usefulNote(event.note), usefulNote(linkedAssist?.note)].filter((note): note is string => note !== null);
      add(event, "goal", describeGoalEvent({ ...event, playerName, assistKind }, source.teamName, source.opponent), detail, [event.playerId, ...(event.isOwnGoal ? [] : [assistId])], notes.length ? [...new Set(notes)].join(" · ") : null);
    } else if (event.type === "assist" && !linkedAssistIds.has(String(event._id))) {
      if (!event.isOpponentGoal && !event.isOwnGoal) { recorded.assists += 1; countPlayer(event.playerId, "assists"); }
      add(event, "assist", formatAssistLine(playerName, event.assistKind) ?? "Assist genoteerd");
    } else if (event.type === "yellow_card" || event.type === "red_card") {
      const label = event.type === "yellow_card" ? "Gele kaart" : "Rode kaart";
      const team = event.isOpponentCard ? source.opponent : source.teamName;
      if (!event.isOpponentCard) {
        const key = event.type === "yellow_card" ? "yellowCards" : "redCards";
        recorded[key] += 1;
        countPlayer(event.playerId, key);
      }
      add(event, "card", `${label} ${team}${playerName ? ` · ${playerName}` : ""}`);
    } else if (event.type === "sub_out" || event.type === "sub_in" || event.type === "substitution_executed") {
      const pair = substitutionPair(event);
      // Older technical markers may omit the participants represented by the paired rows.
      if (event.type === "substitution_executed" && (!pair.outId || !pair.inId) && events.some((other) =>
        (other.type === "sub_out" || other.type === "sub_in") && other.playerId && other.relatedPlayerId && sameAction(event, other)
      )) continue;
      const duplicate = pair.outId && pair.inId && countedSubs.some((previous) => {
        const other = substitutionPair(previous);
        return other.outId === pair.outId && other.inId === pair.inId && sameAction(previous, event);
      });
      if (duplicate) continue;
      countedSubs.push(event);
      recorded.substitutions += 1;
      const outName = named(pair.outId, pair.outName);
      const inName = named(pair.inId, pair.inName);
      const text = pair.outId && pair.inId
        ? `Wissel: ${outName ?? "Speler"} eruit, ${inName ?? "speler"} erin`
        : event.type === "sub_in" ? `${inName ?? "Speler"} erin` : event.type === "sub_out" ? `${outName ?? "Speler"} eruit` : "Wissel uitgevoerd";
      const notes = pair.outId && pair.inId ? events.filter((other) => {
        if (other.type !== "sub_in" && other.type !== "sub_out" && other.type !== "substitution_executed") return false;
        const otherPair = substitutionPair(other);
        return pair.outId === otherPair.outId && pair.inId === otherPair.inId && sameAction(event, other);
      }).map((other) => usefulNote(other.note)).filter((note): note is string => note !== null) : [];
      add(event, "substitution", text, null, [pair.outId, pair.inId], notes.length ? [...new Set(notes)].join(" · ") : usefulNote(event.note));
    } else if (event.type === "quarter_start" || event.type === "quarter_end") {
      add(event, "period", `${periodWord} ${event.quarter} ${event.type === "quarter_start" ? "gestart" : "afgelopen"}`, null, []);
    }
  }

  const completenessNotes = ["Dit verslag bevat alleen vastgelegde wedstrijdgegevens. Niet geregistreerd betekent niet dat een actie niet is gebeurd; het is geen beoordeling van een speler."];
  if (recorded.teamGoals !== score.team || recorded.opponentGoals !== score.opponent) {
    completenessNotes.push(`De vastgelegde eindstand is ${score.label}. De doelpuntregistratie telt ${recorded.teamGoals} voor ${source.teamName} en ${recorded.opponentGoals} voor ${source.opponent}; die aantallen sluiten niet aan op de eindstand.`);
  }
  if (missingTimes) completenessNotes.push("Bij sommige momenten ontbreekt de wedstrijdminuut. Daar staat alleen de periode; de kloktijd wordt niet als speelminuut gebruikt.");
  if (source.players.some((player) => player === null)) completenessNotes.push("Een of meer spelergegevens ontbreken en zijn daarom niet in het spelersoverzicht opgenomen.");
  if (players.some((player) => player.minutesPlayed === null)) completenessNotes.push("Niet voor iedere speler is een bruikbare speeltijd beschikbaar.");
  if (players.some((player) => player.minutesPlayed === 0)) completenessNotes.push("Bij 0 minuten kan ook de speeltijdregistratie ontbreken. Dit zegt niet met zekerheid dat een speler niet heeft meegedaan.");
  completenessNotes.push("Speeltijd komt uit de opgeslagen spelersregistratie. De getoonde aantallen beschrijven uitsluitend geregistreerde acties, geen ranglijst.");
  return {
    matchId: String(source._id), teamName: source.teamName, opponent: source.opponent, homeTeam, awayTeam,
    isHome: source.isHome, scheduledAt: source.scheduledAt ?? null, score,
    summary: `${homeTeam} – ${awayTeam} eindigde in ${score.label}. Hieronder staan de vastgelegde momenten en de geregistreerde speeltijd.`,
    timeline, players, recorded, completenessNotes,
  };
}
