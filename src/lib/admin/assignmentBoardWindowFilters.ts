import type { AssignmentBoardMatchLike } from "./assignmentBoard";

export type AssignmentBoardRefereeNeedFilter =
  | "alle"
  | "scheids-nodig"
  | "coach-fluit-onder10";

export type AssignmentBoardDateWindowFilter =
  | "huidige-speelweek"
  | "drie-weekenden"
  | "alles";

const liveStatuses = new Set(["live", "halftime", "lineup"]);

function extractTeamAge(teamName: string) {
  const upper = teamName.toUpperCase();
  const match = upper.match(/\b(?:J|M)?O(\d{1,2})\b/);
  if (!match) return null;
  const age = Number.parseInt(match[1], 10);
  return Number.isNaN(age) ? null : age;
}

function isUnderTenTeam(teamName: string) {
  const age = extractTeamAge(teamName);
  return age !== null && age <= 10;
}

export function filterAssignmentBoardRefereeNeeds<T extends AssignmentBoardMatchLike>(
  matches: T[],
  filter: AssignmentBoardRefereeNeedFilter
) {
  if (filter === "alle") return matches;

  return matches.filter((match) => {
    const underTenSelfRef = isUnderTenTeam(match.teamName) && match.status === "scheduled";
    if (filter === "coach-fluit-onder10") return underTenSelfRef;
    return !underTenSelfRef;
  });
}

function getStartOfDay(timestampMs: number) {
  const date = new Date(timestampMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getMonday(timestampMs: number) {
  const date = new Date(timestampMs);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function filterAssignmentBoardDateWindow<T extends AssignmentBoardMatchLike>(
  matches: T[],
  windowFilter: AssignmentBoardDateWindowFilter
) {
  if (windowFilter === "alles") return matches;

  const now = Date.now();
  const weekStart = getMonday(now);
  const threeWeekendsEnd = getStartOfDay(now) + 21 * 24 * 60 * 60 * 1000;
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

  return matches.filter((match) => {
    if (liveStatuses.has(match.status)) return true;
    if (!match.scheduledAt) return false;
    if (windowFilter === "huidige-speelweek") {
      return match.scheduledAt >= weekStart && match.scheduledAt < weekEnd;
    }
    return match.scheduledAt >= weekStart && match.scheduledAt < threeWeekendsEnd;
  });
}
