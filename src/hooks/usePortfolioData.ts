"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isError, isPortfolioArray, PortfolioWithHoldings } from "@/types/portfolios";

/**
 * Result type for portfolio data query
 */
export type PortfolioDataResult =
  | { success: true; data: PortfolioWithHoldings[]; isLoading: boolean }
  | { success: false; error: string; isLoading: boolean };

/**
 * Generic result type for Convex queries
 */
export type QueryResult<T> =
  | { success: true; data: T; isLoading: boolean }
  | { success: false; error: string; isLoading: boolean };

/**
 * Hook that abstracts the common pattern of:
 * - Querying user portfolio data
 * - Handling loading state
 * - Handling error state
 * - Validating response format
 */
export function usePortfolioData(): PortfolioDataResult {
  const getPortfolioData = useQuery(
    api.portfolio.getUserPortfolio.getUserPortfolio,
    {}
  );

  // Loading state
  if (getPortfolioData === undefined) {
    return { success: false, error: "Loading...", isLoading: true };
  }

  // Error state from Convex
  if (isError(getPortfolioData)) {
    return { success: false, error: getPortfolioData.error, isLoading: false };
  }

  // Unexpected response format
  if (!isPortfolioArray(getPortfolioData)) {
    return { success: false, error: "Unexpected response format", isLoading: false };
  }

  // Success - return normalized data
  return { success: true, data: getPortfolioData, isLoading: false };
}
