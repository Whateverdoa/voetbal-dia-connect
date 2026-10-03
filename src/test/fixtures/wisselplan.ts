import type { Id } from "@/convex/_generated/dataModel";
import type { Match, SubstitutionPlanRow } from "@/components/match/types";

export const plannedSwap: SubstitutionPlanRow = {
  _id: "plan1" as Id<"substitutionPlans">,
  matchId: "match1" as Id<"matches">,
  sequence: 1,
  kind: "substitution",
  targetQuarter: 1,
  targetMinute: 15,
  playerOutId: "jan" as Id<"players">,
  playerInId: "piet" as Id<"players">,
  outName: "Jan",
  inName: "Piet",
  status: "pending",
  createdAt: 0,
  updatedAt: 0,
};

export const wisselplanMatch: Match = {
  _id: "match1" as Id<"matches">,
  teamId: "team1" as Id<"teams">,
  publicCode: "TEST01",
  teamName: "JO13-2",
  opponent: "Testteam",
  isHome: true,
  status: "live",
  currentQuarter: 1,
  quarterCount: 2,
  homeScore: 0,
  awayScore: 0,
  showLineup: true,
  isCurrentCoachLead: true,
  hasLead: true,
  canControlClock: false,
  refereeId: "ref1" as Id<"referees">,
  refereeName: "Testscheidsrechter",
  formationId: "8v8_1-3-3-1",
  players: [
    { matchPlayerId: "mp-jan" as Id<"matchPlayers">, playerId: plannedSwap.playerOutId,
      name: "Jan", number: 7, onField: true, isKeeper: false, fieldSlotIndex: 1 },
    { matchPlayerId: "mp-piet" as Id<"matchPlayers">, playerId: plannedSwap.playerInId,
      name: "Piet", number: 9, onField: false, isKeeper: false },
  ],
  events: [],
  substitutionPlans: [plannedSwap],
};
