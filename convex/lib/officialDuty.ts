/**
 * Official match duty (clock, score, cards) vs coach substitutions.
 * An assigned referee using the app owns official duty.
 * Match lead (coach) only fills in when nobody is assigned as referee.
 */
export function assignedRefereeOwnsOfficialDuty(match: {
  refereeId?: string | null;
}): boolean {
  return match.refereeId != null && String(match.refereeId).length > 0;
}

export function coachLeadMayPerformOfficialDuty(match: {
  refereeId?: string | null;
}): boolean {
  return !assignedRefereeOwnsOfficialDuty(match);
}
