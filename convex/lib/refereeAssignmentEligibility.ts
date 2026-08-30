import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export type RefereeEligibilityCode =
  | "PROFILE_INACTIVE"
  | "PROFILE_WRONG_CLUB"
  | "CLUB_BLOCKED"
  | "TEAM_BLOCKED"
  | "AGE_GROUP_NOT_ALLOWED"
  | "MATCH_LEVEL_NOT_ALLOWED"
  | "QUALIFICATION_MISMATCH"
  | "MATCH_TIME_MISSING"
  | "REFEREE_UNAVAILABLE"
  | "REFEREE_CONFLICT";

export type RefereeEligibilityResult = {
  eligible: boolean;
  codes: RefereeEligibilityCode[];
  startsAt: number | null;
  endsAt: number | null;
};

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

async function getNeedWindow(
  ctx: ReaderCtx,
  need: Doc<"matchRefereeNeeds">
) {
  const match = await ctx.db.get(need.matchId);
  if (!match) return { match: null, startsAt: null, endsAt: null };
  const startsAt = need.arrivalAt ?? match.scheduledAt ?? null;
  const endsAt =
    need.expectedEndAt ??
    (match.scheduledAt ? match.scheduledAt + 2 * 60 * 60 * 1000 : null);
  return { match, startsAt, endsAt };
}

export async function evaluateRefereeEligibility(
  ctx: ReaderCtx,
  need: Doc<"matchRefereeNeeds">,
  profile: Doc<"refereeProfiles">,
  options: { excludeAssignmentId?: Id<"refereeAssignments"> } = {}
): Promise<RefereeEligibilityResult> {
  const codes: RefereeEligibilityCode[] = [];
  const { match, startsAt, endsAt } = await getNeedWindow(ctx, need);

  if (profile.status !== "active") codes.push("PROFILE_INACTIVE");
  if (profile.clubId !== need.clubId) codes.push("PROFILE_WRONG_CLUB");
  if (profile.blockedClubIds?.includes(need.clubId)) codes.push("CLUB_BLOCKED");
  if (match && profile.blockedTeamIds?.includes(match.teamId)) {
    codes.push("TEAM_BLOCKED");
  }
  if (
    need.ageGroup &&
    profile.allowedAgeGroups?.length &&
    !profile.allowedAgeGroups.includes(need.ageGroup)
  ) {
    codes.push("AGE_GROUP_NOT_ALLOWED");
  }
  if (
    need.matchLevel &&
    profile.allowedMatchLevels?.length &&
    !profile.allowedMatchLevels.includes(need.matchLevel)
  ) {
    codes.push("MATCH_LEVEL_NOT_ALLOWED");
  }
  if (
    need.requiredQualification &&
    profile.qualificationLevel !== need.requiredQualification
  ) {
    codes.push("QUALIFICATION_MISMATCH");
  }
  if (!match || startsAt === null || endsAt === null || startsAt >= endsAt) {
    codes.push("MATCH_TIME_MISSING");
    return { eligible: false, codes, startsAt, endsAt };
  }

  const windows = await ctx.db
    .query("refereeAvailabilityWindows")
    .withIndex("by_referee_and_starts_at", (q) =>
      q.eq("refereeProfileId", profile._id).lt("startsAt", endsAt)
    )
    .take(200);
  if (
    windows.some(
      (window) =>
        window.status === "unavailable" &&
        rangesOverlap(startsAt, endsAt, window.startsAt, window.endsAt)
    )
  ) {
    codes.push("REFEREE_UNAVAILABLE");
  }

  const confirmedAssignments = await ctx.db
    .query("refereeAssignments")
    .withIndex("by_referee_and_status", (q) =>
      q.eq("refereeProfileId", profile._id).eq("status", "confirmed")
    )
    .take(100);
  for (const assignment of confirmedAssignments) {
    if (assignment._id === options.excludeAssignmentId) continue;
    const assignedNeed = await ctx.db.get(assignment.needId);
    if (!assignedNeed) continue;
    const assignedWindow = await getNeedWindow(ctx, assignedNeed);
    if (
      assignedWindow.startsAt !== null &&
      assignedWindow.endsAt !== null &&
      rangesOverlap(
        startsAt,
        endsAt,
        assignedWindow.startsAt,
        assignedWindow.endsAt
      )
    ) {
      codes.push("REFEREE_CONFLICT");
      break;
    }
  }

  return { eligible: codes.length === 0, codes, startsAt, endsAt };
}

export const testHelpers = { rangesOverlap };
