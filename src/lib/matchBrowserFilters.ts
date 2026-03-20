import type { PublicMatch } from "@/types/publicMatch";

const DAY_MS = 24 * 60 * 60 * 1000;
const liveStatuses = new Set<PublicMatch["status"]>(["live", "halftime"]);

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

export function filterMatchesForBrowser(
  matches: PublicMatch[],
  searchTerm: string,
  showAllWithoutSearch = false,
): PublicMatch[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (normalizedSearch) {
    return matches.filter((match) => {
      const haystack = `${match.teamName} ${match.opponent}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }

  if (showAllWithoutSearch) {
    return matches;
  }

  const { from, to } = getWeekendWindow(Date.now());
  return matches.filter((match) => {
    if (liveStatuses.has(match.status)) return true;
    if ((match.status === "scheduled" || match.status === "finished") && match.scheduledAt) {
      return match.scheduledAt >= from && match.scheduledAt <= to;
    }
    return false;
  });
}
