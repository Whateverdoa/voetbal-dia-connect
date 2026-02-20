/**
 * Match lineup facade.
 * Keeps historical `api.matchLineup.*` paths stable while implementation
 * lives in focused modules.
 */
export {
  togglePlayerOnField,
  toggleKeeper,
  assignPlayerToSlot,
  swapFieldPositions,
  setMatchFormation,
} from "./matchLineupCore";
export { togglePlayerAbsent, toggleShowLineup } from "./matchLineupAvailability";
