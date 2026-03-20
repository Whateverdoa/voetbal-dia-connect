import { TEAM_COACH_DATA_PART_1 } from "./coachDataPart1";
import { TEAM_COACH_DATA_PART_2 } from "./coachDataPart2";
import { TEAM_COACH_DATA_PART_3 } from "./coachDataPart3";
import { TEAM_COACH_DATA_PART_4 } from "./coachDataPart4";

export { type TeamCoachSeed } from "./coachTypes";

export const TEAM_COACH_DATA = [
  ...TEAM_COACH_DATA_PART_1,
  ...TEAM_COACH_DATA_PART_2,
  ...TEAM_COACH_DATA_PART_3,
  ...TEAM_COACH_DATA_PART_4,
];
