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
import type * as calculators_getTaxYearInfo from "../calculators/getTaxYearInfo.js";
import type * as calculators_runMonteCarlo from "../calculators/runMonteCarlo.js";
import type * as calculators_seedHistoricalReturns from "../calculators/seedHistoricalReturns.js";
import type * as http from "../http.js";
import type * as portfolio_deleteUserHoldings from "../portfolio/deleteUserHoldings.js";
import type * as portfolio_deleteUserPortfolio from "../portfolio/deleteUserPortfolio.js";
import type * as portfolio_getUserPortfolio from "../portfolio/getUserPortfolio.js";
import type * as portfolio_updateUserHoldings from "../portfolio/updateUserHoldings.js";
import type * as portfolio_updateUserPortfolio from "../portfolio/updateUserPortfolio.js";
import type * as tax_runTaxQuery from "../tax/runTaxQuery.js";
import type * as tax_seedTaxYear from "../tax/seedTaxYear.js";

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
  "calculators/getTaxYearInfo": typeof calculators_getTaxYearInfo;
  "calculators/runMonteCarlo": typeof calculators_runMonteCarlo;
  "calculators/seedHistoricalReturns": typeof calculators_seedHistoricalReturns;
  http: typeof http;
  "portfolio/deleteUserHoldings": typeof portfolio_deleteUserHoldings;
  "portfolio/deleteUserPortfolio": typeof portfolio_deleteUserPortfolio;
  "portfolio/getUserPortfolio": typeof portfolio_getUserPortfolio;
  "portfolio/updateUserHoldings": typeof portfolio_updateUserHoldings;
  "portfolio/updateUserPortfolio": typeof portfolio_updateUserPortfolio;
  "tax/runTaxQuery": typeof tax_runTaxQuery;
  "tax/seedTaxYear": typeof tax_seedTaxYear;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
