/**
 * Admin operations - Re-exports from split modules
 * 
 * All admin mutations require identity-based admin verification (server-side).
 */

// Admin login verification (server-side only)
export { verifyAdminAccessQuery } from "./adminAuth";

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
  listAllMatches,
  listTeamPlayersNotInMatch,
  updateMatch,
} from "./adminMatches";
