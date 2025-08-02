/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as getTaxYearInfo from "../getTaxYearInfo.js";
import type * as http from "../http.js";
import type * as runMonteCarlo from "../runMonteCarlo.js";
import type * as runTaxQuery from "../runTaxQuery.js";
import type * as seedHistoricalReturns from "../seedHistoricalReturns.js";
import type * as seedTaxYear from "../seedTaxYear.js";
import type * as tasks from "../tasks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  getTaxYearInfo: typeof getTaxYearInfo;
  http: typeof http;
  runMonteCarlo: typeof runMonteCarlo;
  runTaxQuery: typeof runTaxQuery;
  seedHistoricalReturns: typeof seedHistoricalReturns;
  seedTaxYear: typeof seedTaxYear;
  tasks: typeof tasks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
