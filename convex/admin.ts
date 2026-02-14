/**
 * Admin operations - Re-exports from split modules
 * 
 * All admin mutations require adminPin verification (server-side).
 * PIN never leaves the server — set via: npx convex env set ADMIN_PIN your-pin
 */

// Admin login verification (server-side only)
export { verifyAdminPinQuery } from "./adminAuth";

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
  listAllMatches,
  createMatch,
  updateMatch,
  deleteMatch,
} from "./adminMatches";
