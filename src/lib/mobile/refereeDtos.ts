import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

type RefereeOffer = NonNullable<
  FunctionReturnType<typeof api.refereeAssignmentQueries.getMyOffer>
>;
type RefereeAssignment = NonNullable<
  FunctionReturnType<typeof api.refereeAssignmentQueries.getMyAssignment>
>;

function isoTimestamp(value: number | null) {
  return value === null ? null : new Date(value).toISOString();
}

function matchDto(match: RefereeOffer["match"] | RefereeAssignment["match"]) {
  return {
    id: String(match.matchId),
    teamName: match.teamName,
    opponent: match.opponent,
    scheduledAt: isoTimestamp(match.scheduledAt),
    isHome: match.isHome,
  };
}

export function refereeOfferDto(offer: RefereeOffer) {
  return {
    id: String(offer.offerId),
    status: offer.status,
    version: offer.version,
    sentAt: isoTimestamp(offer.sentAt),
    expiresAt: isoTimestamp(offer.expiresAt),
    respondedAt: isoTimestamp(offer.respondedAt),
    responseNote: offer.responseNote,
    need: {
      id: String(offer.needId),
      status: offer.needStatus,
      version: offer.needVersion,
      arrivalAt: isoTimestamp(offer.arrivalAt),
      venue: offer.venue,
    },
    match: matchDto(offer.match),
  };
}

export function refereeAssignmentDto(assignment: RefereeAssignment) {
  return {
    id: String(assignment.assignmentId),
    status: assignment.status,
    version: assignment.version,
    confirmedAt: isoTimestamp(assignment.confirmedAt),
    need: {
      id: String(assignment.needId),
      arrivalAt: isoTimestamp(assignment.arrivalAt),
      venue: assignment.venue,
    },
    match: matchDto(assignment.match),
  };
}

export const testHelpers = { isoTimestamp };
