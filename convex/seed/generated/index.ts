import { PLAYER_ROSTERS_PART_1 } from "./playerRostersPart1";
import { PLAYER_ROSTERS_PART_2 } from "./playerRostersPart2";
import { PLAYER_ROSTERS_PART_3 } from "./playerRostersPart3";
import { PLAYER_ROSTERS_PART_4 } from "./playerRostersPart4";
import { PLAYER_ROSTERS_PART_5 } from "./playerRostersPart5";
import { PLAYER_ROSTERS_PART_6 } from "./playerRostersPart6";
import { PLAYER_ROSTERS_PART_7 } from "./playerRostersPart7";

export const REAL_PLAYER_ROSTERS: Record<string, string[]> = {
  ...PLAYER_ROSTERS_PART_1,
  ...PLAYER_ROSTERS_PART_2,
  ...PLAYER_ROSTERS_PART_3,
  ...PLAYER_ROSTERS_PART_4,
  ...PLAYER_ROSTERS_PART_5,
  ...PLAYER_ROSTERS_PART_6,
  ...PLAYER_ROSTERS_PART_7,
};

export const ALL_TEAM_SLUGS = Object.keys(REAL_PLAYER_ROSTERS).sort();
