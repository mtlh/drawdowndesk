/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts_accountCrud from "../accounts/accountCrud.js";
import type * as auth from "../auth.js";
import type * as auth_getUser from "../auth/getUser.js";
import type * as calculators_getTaxYearInfo from "../calculators/getTaxYearInfo.js";
import type * as calculators_runMonteCarlo from "../calculators/runMonteCarlo.js";
import type * as calculators_seedHistoricalReturns from "../calculators/seedHistoricalReturns.js";
import type * as currentUser_getCurrentUser from "../currentUser/getCurrentUser.js";
import type * as financeNotes_financeNotesCrud from "../financeNotes/financeNotesCrud.js";
import type * as goals_goalCrud from "../goals/goalCrud.js";
import type * as http from "../http.js";
import type * as netWorth_netWorthSnapshots from "../netWorth/netWorthSnapshots.js";
import type * as portfolio_currentPriceUpdates_updateHoldingWithTicker from "../portfolio/currentPriceUpdates/updateHoldingWithTicker.js";
import type * as portfolio_deleteUserHoldings from "../portfolio/deleteUserHoldings.js";
import type * as portfolio_deleteUserPortfolio from "../portfolio/deleteUserPortfolio.js";
import type * as portfolio_getUserPortfolio from "../portfolio/getUserPortfolio.js";
import type * as portfolio_portfolioSnapshots from "../portfolio/portfolioSnapshots.js";
import type * as portfolio_updateSimpleHoldings from "../portfolio/updateSimpleHoldings.js";
import type * as portfolio_updateUserHoldings from "../portfolio/updateUserHoldings.js";
import type * as portfolio_updateUserPortfolio from "../portfolio/updateUserPortfolio.js";
import type * as tax_runTaxQuery from "../tax/runTaxQuery.js";
import type * as tax_seedTaxYear from "../tax/seedTaxYear.js";
import type * as tax_userSettings from "../tax/userSettings.js";
import type * as tax_userTaxOverrides from "../tax/userTaxOverrides.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "accounts/accountCrud": typeof accounts_accountCrud;
  auth: typeof auth;
  "auth/getUser": typeof auth_getUser;
  "calculators/getTaxYearInfo": typeof calculators_getTaxYearInfo;
  "calculators/runMonteCarlo": typeof calculators_runMonteCarlo;
  "calculators/seedHistoricalReturns": typeof calculators_seedHistoricalReturns;
  "currentUser/getCurrentUser": typeof currentUser_getCurrentUser;
  "financeNotes/financeNotesCrud": typeof financeNotes_financeNotesCrud;
  "goals/goalCrud": typeof goals_goalCrud;
  http: typeof http;
  "netWorth/netWorthSnapshots": typeof netWorth_netWorthSnapshots;
  "portfolio/currentPriceUpdates/updateHoldingWithTicker": typeof portfolio_currentPriceUpdates_updateHoldingWithTicker;
  "portfolio/deleteUserHoldings": typeof portfolio_deleteUserHoldings;
  "portfolio/deleteUserPortfolio": typeof portfolio_deleteUserPortfolio;
  "portfolio/getUserPortfolio": typeof portfolio_getUserPortfolio;
  "portfolio/portfolioSnapshots": typeof portfolio_portfolioSnapshots;
  "portfolio/updateSimpleHoldings": typeof portfolio_updateSimpleHoldings;
  "portfolio/updateUserHoldings": typeof portfolio_updateUserHoldings;
  "portfolio/updateUserPortfolio": typeof portfolio_updateUserPortfolio;
  "tax/runTaxQuery": typeof tax_runTaxQuery;
  "tax/seedTaxYear": typeof tax_seedTaxYear;
  "tax/userSettings": typeof tax_userSettings;
  "tax/userTaxOverrides": typeof tax_userTaxOverrides;
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
