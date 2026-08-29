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
import type * as breakClockActions from "../breakClockActions.js";
import type * as clerkLink from "../clerkLink.js";
import type * as clockActions from "../clockActions.js";
import type * as coachPlayers from "../coachPlayers.js";
import type * as coachQueries from "../coachQueries.js";
import type * as crons from "../crons.js";
import type * as formationTemplates from "../formationTemplates.js";
import type * as gamification from "../gamification.js";
import type * as helpers from "../helpers.js";
import type * as import_backfillCoachEmails from "../import/backfillCoachEmails.js";
import type * as import_backfillLogos from "../import/backfillLogos.js";
import type * as import_diaTeamNormalize from "../import/diaTeamNormalize.js";
import type * as import_importAllTeams from "../import/importAllTeams.js";
import type * as import_importMatches from "../import/importMatches.js";
import type * as import_importPlayers from "../import/importPlayers.js";
import type * as import_importWedstrijden from "../import/importWedstrijden.js";
import type * as import_matchRosterPolicy from "../import/matchRosterPolicy.js";
import type * as import_matchRosterReplace from "../import/matchRosterReplace.js";
import type * as import_programmaSync from "../import/programmaSync.js";
import type * as import_resultsFetch from "../import/resultsFetch.js";
import type * as import_sportlinkFixturesFetch from "../import/sportlinkFixturesFetch.js";
import type * as import_sportlinkFixturesMapper from "../import/sportlinkFixturesMapper.js";
import type * as import_sportlinkRosterMutations from "../import/sportlinkRosterMutations.js";
import type * as import_sportlinkRosterSync from "../import/sportlinkRosterSync.js";
import type * as import_sportlinkUpsert from "../import/sportlinkUpsert.js";
import type * as import_syncCleanupGhosts from "../import/syncCleanupGhosts.js";
import type * as import_syncScoreApply from "../import/syncScoreApply.js";
import type * as import_syncWedstrijdenToMatches from "../import/syncWedstrijdenToMatches.js";
import type * as import_wedstrijdenMapper from "../import/wedstrijdenMapper.js";
import type * as import_weeklyUpdate from "../import/weeklyUpdate.js";
import type * as lib_adminAccess from "../lib/adminAccess.js";
import type * as lib_adminLiveView from "../lib/adminLiveView.js";
import type * as lib_adminOverride from "../lib/adminOverride.js";
import type * as lib_assistKind from "../lib/assistKind.js";
import type * as lib_benchSubstitutionCore from "../lib/benchSubstitutionCore.js";
import type * as lib_coachNameMatch from "../lib/coachNameMatch.js";
import type * as lib_commandIdempotency from "../lib/commandIdempotency.js";
import type * as lib_diaFields from "../lib/diaFields.js";
import type * as lib_formationTemplateValidate from "../lib/formationTemplateValidate.js";
import type * as lib_lateMatchRoster from "../lib/lateMatchRoster.js";
import type * as lib_localLogos from "../lib/localLogos.js";
import type * as lib_matchBreaks from "../lib/matchBreaks.js";
import type * as lib_matchEventGameTime from "../lib/matchEventGameTime.js";
import type * as lib_matchEventProjection from "../lib/matchEventProjection.js";
import type * as lib_matchHistoryOrder from "../lib/matchHistoryOrder.js";
import type * as lib_matchLogoFields from "../lib/matchLogoFields.js";
import type * as lib_matchTiming from "../lib/matchTiming.js";
import type * as lib_matchesInPlayWeek from "../lib/matchesInPlayWeek.js";
import type * as lib_opsAuth from "../lib/opsAuth.js";
import type * as lib_playWeek from "../lib/playWeek.js";
import type * as lib_positionZones from "../lib/positionZones.js";
import type * as lib_privacyFilter from "../lib/privacyFilter.js";
import type * as lib_publicRefereeDisplay from "../lib/publicRefereeDisplay.js";
import type * as lib_refereeClaimPool from "../lib/refereeClaimPool.js";
import type * as lib_season from "../lib/season.js";
import type * as lib_sportlinkRoster from "../lib/sportlinkRoster.js";
import type * as lib_stoppageAdvisory from "../lib/stoppageAdvisory.js";
import type * as lib_substitutionPlanGuards from "../lib/substitutionPlanGuards.js";
import type * as lib_substitutionPlanRows from "../lib/substitutionPlanRows.js";
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
import type * as ops_completeTscJo132Q4 from "../ops/completeTscJo132Q4.js";
import type * as ops_correctTscJo132Guests from "../ops/correctTscJo132Guests.js";
import type * as ops_equalizeTscJo132Minutes from "../ops/equalizeTscJo132Minutes.js";
import type * as ops_setJo132ActiveRoster from "../ops/setJo132ActiveRoster.js";
import type * as pinHelpers from "../pinHelpers.js";
import type * as playerConsents from "../playerConsents.js";
import type * as playerPhotos from "../playerPhotos.js";
import type * as playingTimeHelpers from "../playingTimeHelpers.js";
import type * as presentationQueries from "../presentationQueries.js";
import type * as publicQueries from "../publicQueries.js";
import type * as refereeActions from "../refereeActions.js";
import type * as refereeClaimWindows from "../refereeClaimWindows.js";
import type * as refereeEmailActions from "../refereeEmailActions.js";
import type * as refereeEmailQueries from "../refereeEmailQueries.js";
import type * as refereeHelpers from "../refereeHelpers.js";
import type * as refereeNotifications from "../refereeNotifications.js";
import type * as refereePool from "../refereePool.js";
import type * as refereeQueries from "../refereeQueries.js";
import type * as schemaFragments from "../schemaFragments.js";
import type * as scoreActions from "../scoreActions.js";
import type * as seasonArchive from "../seasonArchive.js";
import type * as seasonMigrations from "../seasonMigrations.js";
import type * as seasonReset from "../seasonReset.js";
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
import type * as stoppageActions from "../stoppageActions.js";
import type * as substitutionPlans from "../substitutionPlans.js";
import type * as teams from "../teams.js";
import type * as userQueries from "../userQueries.js";

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
  breakClockActions: typeof breakClockActions;
  clerkLink: typeof clerkLink;
  clockActions: typeof clockActions;
  coachPlayers: typeof coachPlayers;
  coachQueries: typeof coachQueries;
  crons: typeof crons;
  formationTemplates: typeof formationTemplates;
  gamification: typeof gamification;
  helpers: typeof helpers;
  "import/backfillCoachEmails": typeof import_backfillCoachEmails;
  "import/backfillLogos": typeof import_backfillLogos;
  "import/diaTeamNormalize": typeof import_diaTeamNormalize;
  "import/importAllTeams": typeof import_importAllTeams;
  "import/importMatches": typeof import_importMatches;
  "import/importPlayers": typeof import_importPlayers;
  "import/importWedstrijden": typeof import_importWedstrijden;
  "import/matchRosterPolicy": typeof import_matchRosterPolicy;
  "import/matchRosterReplace": typeof import_matchRosterReplace;
  "import/programmaSync": typeof import_programmaSync;
  "import/resultsFetch": typeof import_resultsFetch;
  "import/sportlinkFixturesFetch": typeof import_sportlinkFixturesFetch;
  "import/sportlinkFixturesMapper": typeof import_sportlinkFixturesMapper;
  "import/sportlinkRosterMutations": typeof import_sportlinkRosterMutations;
  "import/sportlinkRosterSync": typeof import_sportlinkRosterSync;
  "import/sportlinkUpsert": typeof import_sportlinkUpsert;
  "import/syncCleanupGhosts": typeof import_syncCleanupGhosts;
  "import/syncScoreApply": typeof import_syncScoreApply;
  "import/syncWedstrijdenToMatches": typeof import_syncWedstrijdenToMatches;
  "import/wedstrijdenMapper": typeof import_wedstrijdenMapper;
  "import/weeklyUpdate": typeof import_weeklyUpdate;
  "lib/adminAccess": typeof lib_adminAccess;
  "lib/adminLiveView": typeof lib_adminLiveView;
  "lib/adminOverride": typeof lib_adminOverride;
  "lib/assistKind": typeof lib_assistKind;
  "lib/benchSubstitutionCore": typeof lib_benchSubstitutionCore;
  "lib/coachNameMatch": typeof lib_coachNameMatch;
  "lib/commandIdempotency": typeof lib_commandIdempotency;
  "lib/diaFields": typeof lib_diaFields;
  "lib/formationTemplateValidate": typeof lib_formationTemplateValidate;
  "lib/lateMatchRoster": typeof lib_lateMatchRoster;
  "lib/localLogos": typeof lib_localLogos;
  "lib/matchBreaks": typeof lib_matchBreaks;
  "lib/matchEventGameTime": typeof lib_matchEventGameTime;
  "lib/matchEventProjection": typeof lib_matchEventProjection;
  "lib/matchHistoryOrder": typeof lib_matchHistoryOrder;
  "lib/matchLogoFields": typeof lib_matchLogoFields;
  "lib/matchTiming": typeof lib_matchTiming;
  "lib/matchesInPlayWeek": typeof lib_matchesInPlayWeek;
  "lib/opsAuth": typeof lib_opsAuth;
  "lib/playWeek": typeof lib_playWeek;
  "lib/positionZones": typeof lib_positionZones;
  "lib/privacyFilter": typeof lib_privacyFilter;
  "lib/publicRefereeDisplay": typeof lib_publicRefereeDisplay;
  "lib/refereeClaimPool": typeof lib_refereeClaimPool;
  "lib/season": typeof lib_season;
  "lib/sportlinkRoster": typeof lib_sportlinkRoster;
  "lib/stoppageAdvisory": typeof lib_stoppageAdvisory;
  "lib/substitutionPlanGuards": typeof lib_substitutionPlanGuards;
  "lib/substitutionPlanRows": typeof lib_substitutionPlanRows;
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
  "ops/completeTscJo132Q4": typeof ops_completeTscJo132Q4;
  "ops/correctTscJo132Guests": typeof ops_correctTscJo132Guests;
  "ops/equalizeTscJo132Minutes": typeof ops_equalizeTscJo132Minutes;
  "ops/setJo132ActiveRoster": typeof ops_setJo132ActiveRoster;
  pinHelpers: typeof pinHelpers;
  playerConsents: typeof playerConsents;
  playerPhotos: typeof playerPhotos;
  playingTimeHelpers: typeof playingTimeHelpers;
  presentationQueries: typeof presentationQueries;
  publicQueries: typeof publicQueries;
  refereeActions: typeof refereeActions;
  refereeClaimWindows: typeof refereeClaimWindows;
  refereeEmailActions: typeof refereeEmailActions;
  refereeEmailQueries: typeof refereeEmailQueries;
  refereeHelpers: typeof refereeHelpers;
  refereeNotifications: typeof refereeNotifications;
  refereePool: typeof refereePool;
  refereeQueries: typeof refereeQueries;
  schemaFragments: typeof schemaFragments;
  scoreActions: typeof scoreActions;
  seasonArchive: typeof seasonArchive;
  seasonMigrations: typeof seasonMigrations;
  seasonReset: typeof seasonReset;
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
  stoppageActions: typeof stoppageActions;
  substitutionPlans: typeof substitutionPlans;
  teams: typeof teams;
  userQueries: typeof userQueries;
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
