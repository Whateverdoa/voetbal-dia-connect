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
import type * as adminAuth from "../adminAuth.js";
import type * as adminClubs from "../adminClubs.js";
import type * as adminCoaches from "../adminCoaches.js";
import type * as adminMatches from "../adminMatches.js";
import type * as adminPlayers from "../adminPlayers.js";
import type * as adminReferees from "../adminReferees.js";
import type * as adminTeams from "../adminTeams.js";
import type * as clockActions from "../clockActions.js";
import type * as coachQueries from "../coachQueries.js";
import type * as helpers from "../helpers.js";
import type * as matchActions from "../matchActions.js";
import type * as matchEvents from "../matchEvents.js";
import type * as matchLeadActions from "../matchLeadActions.js";
import type * as matchLineup from "../matchLineup.js";
import type * as matchQueries from "../matchQueries.js";
import type * as matches from "../matches.js";
import type * as pinHelpers from "../pinHelpers.js";
import type * as playingTimeHelpers from "../playingTimeHelpers.js";
import type * as publicQueries from "../publicQueries.js";
import type * as refereeActions from "../refereeActions.js";
import type * as refereeHelpers from "../refereeHelpers.js";
import type * as scoreActions from "../scoreActions.js";
import type * as seed from "../seed.js";
import type * as seed_helpers from "../seed/helpers.js";
import type * as seed_index from "../seed/index.js";
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
  adminAuth: typeof adminAuth;
  adminClubs: typeof adminClubs;
  adminCoaches: typeof adminCoaches;
  adminMatches: typeof adminMatches;
  adminPlayers: typeof adminPlayers;
  adminReferees: typeof adminReferees;
  adminTeams: typeof adminTeams;
  clockActions: typeof clockActions;
  coachQueries: typeof coachQueries;
  helpers: typeof helpers;
  matchActions: typeof matchActions;
  matchEvents: typeof matchEvents;
  matchLeadActions: typeof matchLeadActions;
  matchLineup: typeof matchLineup;
  matchQueries: typeof matchQueries;
  matches: typeof matches;
  pinHelpers: typeof pinHelpers;
  playingTimeHelpers: typeof playingTimeHelpers;
  publicQueries: typeof publicQueries;
  refereeActions: typeof refereeActions;
  refereeHelpers: typeof refereeHelpers;
  scoreActions: typeof scoreActions;
  seed: typeof seed;
  "seed/helpers": typeof seed_helpers;
  "seed/index": typeof seed_index;
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
