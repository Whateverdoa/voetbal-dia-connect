/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminAccessManagement from "../adminAccessManagement.js";
import type * as adminAuth from "../adminAuth.js";
import type * as adminClubs from "../adminClubs.js";
import type * as adminCoaches from "../adminCoaches.js";
import type * as adminMatchPlayers from "../adminMatchPlayers.js";
import type * as adminMatches from "../adminMatches.js";
import type * as adminMigrations from "../adminMigrations.js";
import type * as adminPlayers from "../adminPlayers.js";
import type * as adminReferees from "../adminReferees.js";
import type * as adminSeed from "../adminSeed.js";
import type * as adminTeams from "../adminTeams.js";
import type * as clerkLink from "../clerkLink.js";
import type * as clockActions from "../clockActions.js";
import type * as coachQueries from "../coachQueries.js";
import type * as helpers from "../helpers.js";
import type * as import_backfillLogos from "../import/backfillLogos.js";
import type * as import_importAllTeams from "../import/importAllTeams.js";
import type * as import_importMatches from "../import/importMatches.js";
import type * as import_importPlayers from "../import/importPlayers.js";
import type * as import_importWedstrijden from "../import/importWedstrijden.js";
import type * as import_syncWedstrijdenToMatches from "../import/syncWedstrijdenToMatches.js";
import type * as import_wedstrijdenMapper from "../import/wedstrijdenMapper.js";
import type * as lib_adminAccess from "../lib/adminAccess.js";
import type * as lib_commandIdempotency from "../lib/commandIdempotency.js";
import type * as lib_localLogos from "../lib/localLogos.js";
import type * as lib_matchEventGameTime from "../lib/matchEventGameTime.js";
import type * as lib_matchEventProjection from "../lib/matchEventProjection.js";
import type * as lib_matchLogoFields from "../lib/matchLogoFields.js";
import type * as lib_opsAuth from "../lib/opsAuth.js";
import type * as lib_positionZones from "../lib/positionZones.js";
import type * as lib_timezone from "../lib/timezone.js";
import type * as lib_userAccess from "../lib/userAccess.js";
import type * as matchActions from "../matchActions.js";
import type * as matchEvents from "../matchEvents.js";
import type * as matchGoalEnrichmentActions from "../matchGoalEnrichmentActions.js";
import type * as matchLeadActions from "../matchLeadActions.js";
import type * as matchLifecycleActions from "../matchLifecycleActions.js";
import type * as matchLineup from "../matchLineup.js";
import type * as matchLineupAvailability from "../matchLineupAvailability.js";
import type * as matchLineupCore from "../matchLineupCore.js";
import type * as matchLineupSubstitutions from "../matchLineupSubstitutions.js";
import type * as matchPhase3Actions from "../matchPhase3Actions.js";
import type * as matchPregameActions from "../matchPregameActions.js";
import type * as matchQueries from "../matchQueries.js";
import type * as matches from "../matches.js";
import type * as pinHelpers from "../pinHelpers.js";
import type * as playingTimeHelpers from "../playingTimeHelpers.js";
import type * as publicQueries from "../publicQueries.js";
import type * as refereeActions from "../refereeActions.js";
import type * as refereeHelpers from "../refereeHelpers.js";
import type * as refereeQueries from "../refereeQueries.js";
import type * as scoreActions from "../scoreActions.js";
import type * as seed from "../seed.js";
import type * as seed_coachData from "../seed/coachData.js";
import type * as seed_generated_coachData from "../seed/generated/coachData.js";
import type * as seed_generated_coachDataPart1 from "../seed/generated/coachDataPart1.js";
import type * as seed_generated_coachDataPart2 from "../seed/generated/coachDataPart2.js";
import type * as seed_generated_coachDataPart3 from "../seed/generated/coachDataPart3.js";
import type * as seed_generated_coachDataPart4 from "../seed/generated/coachDataPart4.js";
import type * as seed_generated_coachTypes from "../seed/generated/coachTypes.js";
import type * as seed_generated_index from "../seed/generated/index.js";
import type * as seed_generated_playerRostersPart1 from "../seed/generated/playerRostersPart1.js";
import type * as seed_generated_playerRostersPart2 from "../seed/generated/playerRostersPart2.js";
import type * as seed_generated_playerRostersPart3 from "../seed/generated/playerRostersPart3.js";
import type * as seed_generated_playerRostersPart4 from "../seed/generated/playerRostersPart4.js";
import type * as seed_generated_playerRostersPart5 from "../seed/generated/playerRostersPart5.js";
import type * as seed_generated_playerRostersPart6 from "../seed/generated/playerRostersPart6.js";
import type * as seed_generated_playerRostersPart7 from "../seed/generated/playerRostersPart7.js";
import type * as seed_helpers from "../seed/helpers.js";
import type * as seed_index from "../seed/index.js";
import type * as seed_realData from "../seed/realData.js";
import type * as seed_seedData from "../seed/seedData.js";
import type * as seed_seedMatches from "../seed/seedMatches.js";
import type * as seed_seedPlayers from "../seed/seedPlayers.js";
import type * as stats from "../stats.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAccessManagement: typeof adminAccessManagement;
  adminAuth: typeof adminAuth;
  adminClubs: typeof adminClubs;
  adminCoaches: typeof adminCoaches;
  adminMatchPlayers: typeof adminMatchPlayers;
  adminMatches: typeof adminMatches;
  adminMigrations: typeof adminMigrations;
  adminPlayers: typeof adminPlayers;
  adminReferees: typeof adminReferees;
  adminSeed: typeof adminSeed;
  adminTeams: typeof adminTeams;
  clerkLink: typeof clerkLink;
  clockActions: typeof clockActions;
  coachQueries: typeof coachQueries;
  helpers: typeof helpers;
  "import/backfillLogos": typeof import_backfillLogos;
  "import/importAllTeams": typeof import_importAllTeams;
  "import/importMatches": typeof import_importMatches;
  "import/importPlayers": typeof import_importPlayers;
  "import/importWedstrijden": typeof import_importWedstrijden;
  "import/syncWedstrijdenToMatches": typeof import_syncWedstrijdenToMatches;
  "import/wedstrijdenMapper": typeof import_wedstrijdenMapper;
  "lib/adminAccess": typeof lib_adminAccess;
  "lib/commandIdempotency": typeof lib_commandIdempotency;
  "lib/localLogos": typeof lib_localLogos;
  "lib/matchEventGameTime": typeof lib_matchEventGameTime;
  "lib/matchEventProjection": typeof lib_matchEventProjection;
  "lib/matchLogoFields": typeof lib_matchLogoFields;
  "lib/opsAuth": typeof lib_opsAuth;
  "lib/positionZones": typeof lib_positionZones;
  "lib/timezone": typeof lib_timezone;
  "lib/userAccess": typeof lib_userAccess;
  matchActions: typeof matchActions;
  matchEvents: typeof matchEvents;
  matchGoalEnrichmentActions: typeof matchGoalEnrichmentActions;
  matchLeadActions: typeof matchLeadActions;
  matchLifecycleActions: typeof matchLifecycleActions;
  matchLineup: typeof matchLineup;
  matchLineupAvailability: typeof matchLineupAvailability;
  matchLineupCore: typeof matchLineupCore;
  matchLineupSubstitutions: typeof matchLineupSubstitutions;
  matchPhase3Actions: typeof matchPhase3Actions;
  matchPregameActions: typeof matchPregameActions;
  matchQueries: typeof matchQueries;
  matches: typeof matches;
  pinHelpers: typeof pinHelpers;
  playingTimeHelpers: typeof playingTimeHelpers;
  publicQueries: typeof publicQueries;
  refereeActions: typeof refereeActions;
  refereeHelpers: typeof refereeHelpers;
  refereeQueries: typeof refereeQueries;
  scoreActions: typeof scoreActions;
  seed: typeof seed;
  "seed/coachData": typeof seed_coachData;
  "seed/generated/coachData": typeof seed_generated_coachData;
  "seed/generated/coachDataPart1": typeof seed_generated_coachDataPart1;
  "seed/generated/coachDataPart2": typeof seed_generated_coachDataPart2;
  "seed/generated/coachDataPart3": typeof seed_generated_coachDataPart3;
  "seed/generated/coachDataPart4": typeof seed_generated_coachDataPart4;
  "seed/generated/coachTypes": typeof seed_generated_coachTypes;
  "seed/generated/index": typeof seed_generated_index;
  "seed/generated/playerRostersPart1": typeof seed_generated_playerRostersPart1;
  "seed/generated/playerRostersPart2": typeof seed_generated_playerRostersPart2;
  "seed/generated/playerRostersPart3": typeof seed_generated_playerRostersPart3;
  "seed/generated/playerRostersPart4": typeof seed_generated_playerRostersPart4;
  "seed/generated/playerRostersPart5": typeof seed_generated_playerRostersPart5;
  "seed/generated/playerRostersPart6": typeof seed_generated_playerRostersPart6;
  "seed/generated/playerRostersPart7": typeof seed_generated_playerRostersPart7;
  "seed/helpers": typeof seed_helpers;
  "seed/index": typeof seed_index;
  "seed/realData": typeof seed_realData;
  "seed/seedData": typeof seed_seedData;
  "seed/seedMatches": typeof seed_seedMatches;
  "seed/seedPlayers": typeof seed_seedPlayers;
  stats: typeof stats;
  teams: typeof teams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
