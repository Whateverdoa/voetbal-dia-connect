/**
 * Shared types and utilities for public match views.
 * Used by MatchBrowser and Standen page.
 */

// Includes "lineup" for TypeScript compatibility with the full Convex schema type,
// even though listPublicMatches filters it out before returning.
export type PublicMatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

export interface PublicMatch {
  _id: string;
  publicCode: string;
  opponent: string;
  isHome: boolean;
  status: PublicMatchStatus;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  quarterCount: number;
  scheduledAt?: number;
  teamName: string;
  clubName: string;
}

/**
 * Format a timestamp as a Dutch date string: "Za 7 feb 08:30"
 */
export function formatMatchDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  // Capitalize first letter: "za 7 feb" → "Za 7 feb"
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${time}`;
}
