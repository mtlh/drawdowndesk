// Shared utility functions for currency conversion in Convex
// Handles GBp (pence) to GBP (pounds) conversion

/**
 * Converts a value from GBp (pence) to GBP (pounds)
 * Yahoo Finance returns GBX/GBp for UK stocks (pence), needs division by 100
 */
export function convertGBpToGBP(valueInPence: number): number {
  return valueInPence / 100;
}

/**
 * Converts a value to GBP based on the currency field
 * GBp values are in pence and need to be divided by 100
 */
export function convertToGBP(value: number, currency: string | undefined): number {
  if (currency === "GBp" || currency === "GBX") {
    return convertGBpToGBP(value);
  }
  return value;
}

/**
 * Converts a holding's price or value to GBP
 * Use for: currentPrice, avgPrice, or any price-related field
 */
export function convertHoldingPriceToGBP(
  price: number,
  currency: string | undefined
): number {
  return convertToGBP(price, currency);
}

/**
 * Calculates the total value of holdings in GBP, handling currency conversion
 */
export function calculateHoldingsValueInGBP(
  holdings: Array<{ shares?: number; currentPrice?: number; currency?: string }>
): number {
  return holdings.reduce((sum, h) => {
    const rawValue = (h.shares || 0) * (h.currentPrice || 0);
    return sum + convertToGBP(rawValue, h.currency);
  }, 0);
}
