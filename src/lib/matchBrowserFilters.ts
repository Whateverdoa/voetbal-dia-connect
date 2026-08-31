import type { PublicMatch } from "@/types/publicMatch";

const DAY_MS = 24 * 60 * 60 * 1000;
const liveStatuses = new Set<PublicMatch["status"]>(["live", "halftime"]);

/** Default youth kickoff length + buffer before we treat "scheduled" as played. */
const OVERDUE_AFTER_MINUTES = 75;

export type BrowserListGroup = "live" | "scheduled" | "finished";

/**
 * Sportlink often never publishes O7–O10 scores. After kickoff those rows
 * must not stay in "Gepland".
 */
export function isScheduledKickoffOverdue(
  match: Pick<PublicMatch, "status" | "scheduledAt">,
  now: number,
): boolean {
  if (match.status !== "scheduled" && match.status !== "lineup") return false;
  if (match.scheduledAt == null || !Number.isFinite(match.scheduledAt)) {
    return false;
  }
  return match.scheduledAt + OVERDUE_AFTER_MINUTES * 60_000 <= now;
}

export function browserListGroup(
  match: Pick<PublicMatch, "status" | "scheduledAt">,
  now: number,
): BrowserListGroup {
  if (liveStatuses.has(match.status as PublicMatch["status"])) return "live";
  if (match.status === "finished") return "finished";
  if (isScheduledKickoffOverdue(match, now)) return "finished";
  return "scheduled";
}

/** Time window for the homepage match list (Dutch copy in UI). */
export type TimeFilter = "weekend" | "today" | "week" | "all";

/** Home vs away for the club team (`teamName` / DIA). */
export type VenueFilter = "all" | "home" | "away";

export function getWeekendWindow(now: number): { from: number; to: number } {
  const base = new Date(now);
  const day = base.getDay(); // 0=Sun ... 6=Sat

  let offsetToFriday = 0;
  if (day === 6) {
    offsetToFriday = -1;
  } else if (day === 0) {
    offsetToFriday = -2;
  } else {
    offsetToFriday = (5 - day + 7) % 7;
  }

  const friday = new Date(base);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() + offsetToFriday);

  const from = friday.getTime();
  const to = from + 3 * DAY_MS - 1;
  return { from, to };
}

function startOfDayMs(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDayMs(now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Monday 00:00 – Sunday 23:59:59 (local), calendar week containing `now`. */
export function getCalendarWeekRange(now: number): { from: number; to: number } {
  const d = new Date(now);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday.getTime(), to: sunday.getTime() };
}

function matchPassesTimeFilter(
  match: PublicMatch,
  timeFilter: TimeFilter,
  now: number
): boolean {
  if (timeFilter === "all") return true;
  if (liveStatuses.has(match.status)) return true;

  const at = match.scheduledAt;
  if (at == null) return false;

  if (timeFilter === "weekend") {
    const { from, to } = getWeekendWindow(now);
    return at >= from && at <= to;
  }
  if (timeFilter === "today") {
    return at >= startOfDayMs(now) && at <= endOfDayMs(now);
  }
  if (timeFilter === "week") {
    const { from, to } = getCalendarWeekRange(now);
    return at >= from && at <= to;
  }
  return false;
}

function matchPassesVenueFilter(
  match: PublicMatch,
  venueFilter: VenueFilter
): boolean {
  if (venueFilter === "all") return true;
  if (venueFilter === "home") return match.isHome === true;
  return match.isHome === false;
}

export function filterMatchesForBrowser(
  matches: PublicMatch[],
  searchTerm: string,
  timeFilter: TimeFilter,
  venueFilter: VenueFilter = "all",
  now: number = Date.now()
): PublicMatch[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  let pool = matches;
  if (normalizedSearch) {
    pool = matches.filter((match) => {
      const haystack = `${match.teamName} ${match.opponent}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }

  return pool
    .filter((m) => matchPassesTimeFilter(m, timeFilter, now))
    .filter((m) => matchPassesVenueFilter(m, venueFilter));
}
