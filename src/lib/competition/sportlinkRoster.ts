/**
 * Re-export Sportlink roster helpers for app-side use/tests.
 */
export {
  displayNameFromIndeling,
  isShieldedName,
  parseIndelingRows,
  parseSportlinkTeamKey,
  slugFromSportlinkTeamName,
  sportlinkTeamKey,
  type ParsedRosterPerson,
  type SportlinkIndelingRow,
  type SportlinkTeamRow,
} from "../../../convex/lib/sportlinkRoster";
