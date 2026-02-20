/**
 * Match actions facade.
 * Keeps historical `api.matchActions.*` paths stable while implementation
 * lives in focused modules.
 */

// Re-export from split modules for backwards compatibility
export { addGoal, substitute, removeLastGoal } from "./matchEvents";
export {
  togglePlayerOnField,
  toggleKeeper,
  togglePlayerAbsent,
  toggleShowLineup,
  assignPlayerToSlot,
  swapFieldPositions,
  substituteFromField,
  setMatchFormation,
} from "./matchLineup";
export { pauseClock, resumeClock } from "./clockActions";
export { adjustScore } from "./scoreActions";
export { assignReferee } from "./refereeActions";
export { claimMatchLead, releaseMatchLead } from "./matchLeadActions";
export {
  create,
  start,
  nextQuarter,
  resumeFromHalftime,
} from "./matchLifecycleActions";
export {
  createPlayerAndAddToMatch,
  addExistingPlayerToMatch,
  updateMatchMetadata,
  updateStatus,
} from "./matchPregameActions";
