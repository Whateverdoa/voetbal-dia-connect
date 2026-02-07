/**
 * Admin operations - Re-exports from split modules
 * 
 * All admin mutations now require adminPin verification.
 * Use ADMIN_PIN environment variable or default "9999" for development.
 */

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
  seedDIA,
  seedMatches,
} from "./adminSeed";
