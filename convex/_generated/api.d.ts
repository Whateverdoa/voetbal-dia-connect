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
import type * as adminPlayers from "../adminPlayers.js";
import type * as adminSeed from "../adminSeed.js";
import type * as adminTeams from "../adminTeams.js";
import type * as clockActions from "../clockActions.js";
import type * as matchActions from "../matchActions.js";
import type * as matchEvents from "../matchEvents.js";
import type * as matchLineup from "../matchLineup.js";
import type * as matchQueries from "../matchQueries.js";
import type * as matches from "../matches.js";
import type * as pinHelpers from "../pinHelpers.js";
import type * as playingTimeHelpers from "../playingTimeHelpers.js";
import type * as scoreActions from "../scoreActions.js";
import type * as seed from "../seed.js";
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
  adminPlayers: typeof adminPlayers;
  adminSeed: typeof adminSeed;
  adminTeams: typeof adminTeams;
  clockActions: typeof clockActions;
  matchActions: typeof matchActions;
  matchEvents: typeof matchEvents;
  matchLineup: typeof matchLineup;
  matchQueries: typeof matchQueries;
  matches: typeof matches;
  pinHelpers: typeof pinHelpers;
  playingTimeHelpers: typeof playingTimeHelpers;
  scoreActions: typeof scoreActions;
  seed: typeof seed;
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
