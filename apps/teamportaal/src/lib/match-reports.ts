import { reportsPath } from "./team";

export interface PublicTeamMatch {
  id: string;
  opponent: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
  scheduledAt: number;
}

export interface TeamMatchReport {
  matchId: string;
  status: "draft" | "published";
  approvedForPublic: boolean;
  publishedAt?: string;
  title: string;
  introduction: string;
  paragraphs: readonly string[];
}

// Public match facts only, checked against DIA Live on 13 October 2026.
// Never add player records, private source reports or staff notes to this file.
export const publicMatches: readonly PublicTeamMatch[] = [
  {
    id: "jn7deav3503m8dyxc8cjx557qn8cv39h",
    opponent: "SV Reeshof O13-1",
    isHome: false,
    homeScore: 3,
    awayScore: 4,
    scheduledAt: 1791617400000,
  },
  {
    id: "jn7dmbwazf8qb77wvegfjj0jr98cvz4c",
    opponent: "Gilze O13-1",
    isHome: true,
    homeScore: 2,
    awayScore: 3,
    scheduledAt: 1791010800000,
  },
  {
    id: "jn7dkp60d7pe6fdg3drjvgyn8s8ctbbq",
    opponent: "TSV Gudok O13-2",
    isHome: true,
    homeScore: 7,
    awayScore: 0,
    scheduledAt: 1790406000000,
  },
  {
    id: "jn72jje5a19yyj6r31beqgyx5n8ct3xs",
    opponent: "Dongen O13-2",
    isHome: false,
    homeScore: 2,
    awayScore: 3,
    scheduledAt: 1789810200000,
  },
  {
    id: "jn752ba1gx734dbe5cxvbf7jkh8cvkka",
    opponent: "VOAB O13-2",
    isHome: false,
    homeScore: 4,
    awayScore: 1,
    scheduledAt: 1789200000000,
  },
  {
    id: "jn7bdvvjd5s1mkb69mmtca6b3s8cvv6e",
    opponent: "Baronie O13-5",
    isHome: true,
    homeScore: 7,
    awayScore: 1,
    scheduledAt: 1788591600000,
  },
  {
    id: "jn79bppqctkefgbjpe3kyx4f218cvy6f",
    opponent: "TSC O13-2",
    isHome: false,
    homeScore: 2,
    awayScore: 2,
    scheduledAt: 1787996700000,
  },
];

// This public deployment may contain only explicitly approved publication text.
// Drafts are authored in the separate coach environment, never in this array.
export const reports: readonly TeamMatchReport[] = [];

export function getPublicReport(
  matchId: string,
  candidates: readonly TeamMatchReport[] = reports,
): TeamMatchReport | undefined {
  return candidates.find(
    (report) =>
      report.matchId === matchId &&
      report.status === "published" &&
      report.approvedForPublic === true &&
      Boolean(report.publishedAt) &&
      Number.isFinite(Date.parse(report.publishedAt!)) &&
      Boolean(report.title.trim()) &&
      report.paragraphs.some((paragraph) => Boolean(paragraph.trim())),
  );
}

export function matchReportPath(match: Pick<PublicTeamMatch, "id">): string {
  return `${reportsPath}/${encodeURIComponent(match.id)}`;
}

export function matchTeams(match: PublicTeamMatch): {
  home: string;
  away: string;
} {
  return match.isHome
    ? { home: "DIA JO13-2", away: match.opponent }
    : { home: match.opponent, away: "DIA JO13-2" };
}

export function matchDate(match: PublicTeamMatch): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(match.scheduledAt);
}
