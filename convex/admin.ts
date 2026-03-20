/**
 * Admin operations - Re-exports from split modules
 *
 * Admin operations require authenticated Clerk identity + `userAccess`.
 */

export { verifyAdminAccessQuery } from "./adminAuth";

export {
  backfillUserAccess,
  deactivateUserAccessByEmail,
  listUserAccess,
} from "./adminAccessManagement";

// Re-export all admin operations
export {
  createClub,
  getClubBySlug,
  listClubs,
  updateClub,
  deleteClub,
} from "./adminClubs";

export {
  createTeam,
  listTeamsByClub,
  getTeam,
  listAllTeams,
  updateTeam,
  deleteTeam,
} from "./adminTeams";

export {
  createCoach,
  listCoaches,
  updateCoach,
  deleteCoach,
} from "./adminCoaches";

export {
  createPlayer,
  createPlayers,
  listPlayersByTeam,
  updatePlayer,
  deletePlayer,
} from "./adminPlayers";

export {
  createReferee,
  listReferees,
  updateReferee,
  deleteReferee,
} from "./adminReferees";

export {
  addPlayerToMatch,
  createMatch,
  createPlayerAndAddToMatch,
  deleteMatch,
  listAssignmentBoard,
  listAllMatches,
  listTeamPlayersNotInMatch,
  updateMatch,
} from "./adminMatches";
