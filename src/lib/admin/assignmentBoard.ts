export type AssignmentBoardStatusFilter =
  | "alle"
  | "gepland"
  | "live"
  | "afgelopen"
  | "zonder-scheidsrechter";
export type AssignmentBoardVenueFilter = "thuis" | "alle";

export type QualificationState = "geschikt" | "mogelijk" | "onbekend";

export interface AssignmentBoardMatchLike {
  _id: string;
  clubId: string;
  clubName: string;
  teamId: string;
  teamName: string;
  opponent: string;
  isHome: boolean;
  status: string;
  publicCode: string;
  scheduledAt?: number;
  refereeName: string | null;
  coachName?: string | null;
  dateKey: string;
  dateLabel: string;
  qualificationState: QualificationState;
}

export interface AssignmentTabItem {
  key: string;
  label: string;
  count: number;
}

const liveStatuses = new Set(["live", "halftime", "lineup"]);

export const REFEREE_QUALIFICATION_PRESETS = [
  "JO8",
  "JO10",
  "JO12",
  "JO14",
  "JO16",
  "JO18",
  "6v6",
  "8v8",
  "11v11",
  "basis",
  "ervaren",
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function canonicalQualificationTag(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  if (/^JO\d{1,2}$/.test(upper)) {
    return upper;
  }

  if (/^\d+V\d+$/.test(upper)) {
    return lower;
  }

  if (lower === "basis" || lower === "ervaren") {
    return lower;
  }

  return trimmed;
}

export function normalizeQualificationTags(tags?: string[] | null) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags ?? []) {
    const canonical = canonicalQualificationTag(tag);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    normalized.push(canonical);
  }

  return normalized;
}

export function deriveMatchQualificationTags(teamName: string, quarterCount: number) {
  const tags: string[] = [];
  const ageMatch = teamName.toUpperCase().match(/JO\d{1,2}/);
  const ageTag = ageMatch?.[0];

  if (ageTag) {
    tags.push(ageTag);
    const ageNumber = Number.parseInt(ageTag.replace("JO", ""), 10);
    if (ageNumber <= 10) {
      tags.push("6v6");
    } else if (ageNumber <= 12) {
      tags.push("8v8");
    } else {
      tags.push("11v11");
    }
  } else if (quarterCount === 4) {
    tags.push("8v8");
  } else if (quarterCount === 2) {
    tags.push("11v11");
  }

  return normalizeQualificationTags(tags);
}

export function getQualificationState(
  matchTags: string[],
  refereeTags?: string[] | null
): QualificationState {
  const normalizedRefereeTags = normalizeQualificationTags(refereeTags);
  if (normalizedRefereeTags.length === 0) {
    return "onbekend";
  }

  const normalizedMatchTags = new Set(normalizeQualificationTags(matchTags));
  for (const refereeTag of normalizedRefereeTags) {
    if (normalizedMatchTags.has(refereeTag)) {
      return "geschikt";
    }
  }

  return "mogelijk";
}

export function getAssignmentDateKey(timestamp?: number) {
  if (!timestamp) return "ongepland";

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAssignmentDateLabel(timestamp?: number) {
  if (!timestamp) return "Ongepland";

  const date = new Date(timestamp);
  const label = date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return capitalize(label);
}

function getStatusPriority(status: string) {
  if (status === "live") return 0;
  if (status === "halftime") return 1;
  if (status === "lineup") return 2;
  if (status === "scheduled") return 3;
  if (status === "finished") return 4;
  return 9;
}

export function compareAssignmentBoardMatches(
  left: Pick<AssignmentBoardMatchLike, "status" | "scheduledAt" | "_id">,
  right: Pick<AssignmentBoardMatchLike, "status" | "scheduledAt" | "_id">
) {
  const statusPriority = getStatusPriority(left.status) - getStatusPriority(right.status);
  if (statusPriority !== 0) return statusPriority;

  const leftTimestamp = left.scheduledAt ?? Number.MAX_SAFE_INTEGER;
  const rightTimestamp = right.scheduledAt ?? Number.MAX_SAFE_INTEGER;
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return String(left._id).localeCompare(String(right._id));
}

export function getAssignmentClubTabs(matches: AssignmentBoardMatchLike[]) {
  const counts = new Map<string, AssignmentTabItem>();

  for (const match of matches) {
    const current = counts.get(match.clubId);
    if (current) {
      current.count += 1;
      continue;
    }

    counts.set(match.clubId, {
      key: match.clubId,
      label: match.clubName,
      count: 1,
    });
  }

  return Array.from(counts.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "nl-NL")
  );
}

export function getAssignmentDateTabs(
  matches: AssignmentBoardMatchLike[],
  selectedClubId: string
) {
  const counts = new Map<string, AssignmentTabItem>();
  const selectedClubMatches = matches.filter((match) => match.clubId === selectedClubId);

  for (const match of selectedClubMatches) {
    const current = counts.get(match.dateKey);
    if (current) {
      current.count += 1;
      continue;
    }

    counts.set(match.dateKey, {
      key: match.dateKey,
      label: match.dateLabel,
      count: 1,
    });
  }

  return Array.from(counts.values()).sort((left, right) => {
    if (left.key === "ongepland") return 1;
    if (right.key === "ongepland") return -1;
    return left.key.localeCompare(right.key, "nl-NL");
  });
}

export function filterAssignmentBoardMatches<T extends AssignmentBoardMatchLike>(
  matches: T[],
  searchTerm: string,
  statusFilter: AssignmentBoardStatusFilter,
  teamFilter = "alle"
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return matches.filter((match) => {
    if (statusFilter === "gepland" && match.status !== "scheduled") return false;
    if (statusFilter === "live" && !liveStatuses.has(match.status)) return false;
    if (statusFilter === "afgelopen" && match.status !== "finished") return false;
    if (statusFilter === "zonder-scheidsrechter" && match.refereeName) return false;

    if (teamFilter !== "alle" && match.teamName !== teamFilter) return false;

    if (!normalizedSearch) return true;

    return [
      match.clubName,
      match.teamName,
      match.opponent,
      match.publicCode,
      match.refereeName ?? "",
      match.coachName ?? "",
      match.dateLabel,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

export function filterAssignmentBoardVenueMatches<T extends AssignmentBoardMatchLike>(
  matches: T[],
  venueFilter: AssignmentBoardVenueFilter
) {
  if (venueFilter === "alle") {
    return matches;
  }

  return matches.filter((match) => match.isHome);
}

export function getVisibleAssignmentBoardMatches<T extends AssignmentBoardMatchLike>(
  matches: T[],
  selectedClubId: string,
  selectedDateKey: string
) {
  return matches
    .filter(
      (match) => match.clubId === selectedClubId && match.dateKey === selectedDateKey
    )
    .sort(compareAssignmentBoardMatches);
}
