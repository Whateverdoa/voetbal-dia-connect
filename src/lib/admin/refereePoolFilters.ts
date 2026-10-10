import { normalizeQualificationTags } from "./assignmentBoard";

export type RefereePoolActiveFilter = "alle" | "actief" | "inactief";
export type RefereePoolMembershipFilter = "alle" | "in-poule" | "buiten-poule";
export type RefereePoolTagsFilter = "alle" | "met-tags" | "zonder-tags";

export type RefereePoolFilterable = {
  name: string;
  email?: string;
  contactEmail?: string;
  active: boolean;
  inClaimPool?: boolean;
  qualificationTags?: string[] | null;
};

export type RefereePoolFilters = {
  search: string;
  activeFilter: RefereePoolActiveFilter;
  membershipFilter: RefereePoolMembershipFilter;
  tagsFilter: RefereePoolTagsFilter;
  /** Empty = any tags; otherwise referee must include at least one selected tag. */
  requiredTags: string[];
};

export function isInClaimPool(referee: { inClaimPool?: boolean }): boolean {
  return referee.inClaimPool === true;
}

export function filterRefereePool<T extends RefereePoolFilterable>(
  referees: T[],
  filters: RefereePoolFilters
): T[] {
  const search = filters.search.trim().toLowerCase();
  const required = new Set(normalizeQualificationTags(filters.requiredTags));

  return referees
    .filter((referee) => {
      if (filters.activeFilter === "actief" && !referee.active) return false;
      if (filters.activeFilter === "inactief" && referee.active) return false;

      const inPool = isInClaimPool(referee);
      if (filters.membershipFilter === "in-poule" && !inPool) return false;
      if (filters.membershipFilter === "buiten-poule" && inPool) return false;

      const tags = normalizeQualificationTags(referee.qualificationTags);
      if (filters.tagsFilter === "met-tags" && tags.length === 0) return false;
      if (filters.tagsFilter === "zonder-tags" && tags.length > 0) return false;

      if (required.size > 0) {
        const hasAny = tags.some((tag) => required.has(tag));
        if (!hasAny) return false;
      }

      if (!search) return true;
      const haystack = [
        referee.name,
        referee.email ?? "",
        referee.contactEmail ?? "",
        ...tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl-NL"));
}

export function summarizeRefereePool<T extends RefereePoolFilterable>(
  referees: T[]
) {
  const inPoule = referees.filter(isInClaimPool).length;
  const active = referees.filter((r) => r.active).length;
  const withoutTags = referees.filter(
    (r) => normalizeQualificationTags(r.qualificationTags).length === 0
  ).length;
  return {
    total: referees.length,
    inPoule,
    active,
    withoutTags,
  };
}
