/**
 * Unified UK tax calculation utilities.
 * Provides functions for income tax, capital gains tax, and take-home pay calculations.
 */

// ============================================================================
// Types
// ============================================================================

export interface TaxBand {
  bandName: string;
  bandStartAmount: number;
  bandEndAmount?: number;
  taxRatePercent: number;
}

export interface PersonalAllowance {
  amount: number;
  taperThreshold?: number;
  taperRatePercent?: number;
}

export interface CapitalGainsTaxConfig {
  annualExemptAmount: number;
  basicRatePercent: number;
  higherRatePercent: number;
}

export interface TaxRates {
  personalAllowance: PersonalAllowance;
  bands: TaxBand[];
  capitalGainsTax: CapitalGainsTaxConfig;
}

export interface TaxCalculationResult {
  incomeTax: number;
  nationalInsurance?: number;
  takeHomePay?: number;
  personalAllowance: number;
}

// ============================================================================
// Income Tax Calculations
// ============================================================================

/**
 * Calculate income tax using UK tax bands.
 * Supports basic, higher, and additional rate bands.
 * Optionally applies personal allowance tapering for incomes over £100k.
 */
export function calculateIncomeTax(
  taxableIncome: number,
  taxRates: TaxRates
): number {
  if (!taxRates || !taxRates.personalAllowance || !taxRates.bands) {
    return 0;
  }

  const { personalAllowance, bands } = taxRates;

  // No tax if below personal allowance
  if (taxableIncome <= personalAllowance.amount) {
    return 0;
  }

  // Apply personal allowance tapering if over threshold
  let effectiveAllowance = personalAllowance.amount;
  if (
    personalAllowance.taperThreshold &&
    personalAllowance.taperRatePercent &&
    taxableIncome > personalAllowance.taperThreshold
  ) {
    const excess = taxableIncome - personalAllowance.taperThreshold;
    const taperedAmount = excess * (personalAllowance.taperRatePercent / 100);
    effectiveAllowance = Math.max(0, personalAllowance.amount - taperedAmount);
  }

  const taxableAmount = taxableIncome - effectiveAllowance;
  if (taxableAmount <= 0) {
    return 0;
  }

  let tax = 0;

  // Calculate tax across bands (assumes bands are ordered: basic, higher, additional)
  // UK bands start at £0, but the bands in DB start at personal allowance level
  // So we track previous band end starting from 0
  let previousBandEnd = 0;

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    const nextBand = bands[i + 1];
    const bandEnd = nextBand ? nextBand.bandStartAmount : Infinity;

    // How much of this band applies to our taxable amount
    // Amount is from where previous band ended to min(taxableAmount, bandEnd)
    const taxableInThisBand = Math.max(
      0,
      Math.min(taxableAmount, bandEnd) - previousBandEnd
    );

    if (taxableInThisBand > 0) {
      tax += taxableInThisBand * (band.taxRatePercent / 100);
    }

    previousBandEnd = bandEnd;
  }

  return tax;
}

/**
 * Calculate take-home pay after income tax and national insurance.
 * Wrapper around calculateIncomeTax that adds NI calculation.
 */
export function calculateTakeHomePay(
  grossIncome: number,
  taxRates: TaxRates,
  includeNationalInsurance: boolean = true
): TaxCalculationResult {
  const incomeTax = calculateIncomeTax(grossIncome, taxRates);

  // Calculate personal allowance (with tapering)
  let personalAllowance = taxRates.personalAllowance.amount;
  if (
    taxRates.personalAllowance.taperThreshold &&
    taxRates.personalAllowance.taperRatePercent &&
    grossIncome > taxRates.personalAllowance.taperThreshold
  ) {
    const excess = grossIncome - taxRates.personalAllowance.taperThreshold;
    const taperedAmount = excess * (taxRates.personalAllowance.taperRatePercent / 100);
    personalAllowance = Math.max(0, personalAllowance - taperedAmount);
  }

  // Simple NI calculation (class 1 - main rate for 2023/24)
  // Note: This is a simplified version; real NI has multiple thresholds
  let nationalInsurance = 0;
  if (includeNationalInsurance) {
    const niThreshold = 12570; // 2023/24 primary threshold
    const niUpperLimit = 50270; // 2023/24 upper limit
    if (grossIncome > niThreshold) {
      const niTaxableAtMainRate = Math.min(grossIncome, niUpperLimit) - niThreshold;
      const niTaxableAtAdditionalRate = Math.max(0, grossIncome - niUpperLimit);
      nationalInsurance = niTaxableAtMainRate * 0.12 + niTaxableAtAdditionalRate * 0.02;
    }
  }

  const takeHomePay = grossIncome - incomeTax - nationalInsurance;

  return {
    incomeTax,
    nationalInsurance: includeNationalInsurance ? nationalInsurance : undefined,
    takeHomePay,
    personalAllowance,
  };
}

/**
 * Calculate National Insurance for employment income.
 * Note: Pension income does not attract NI.
 * Uses 2024/25 rates: threshold £12,570, upper limit £50,270
 * Main rate 8% between threshold and upper limit, 2% above
 */
export function calculateNationalInsurance(grossIncome: number): number {
  const niThreshold = 12570;
  const niUpperLimit = 50270;

  if (grossIncome <= niThreshold) {
    return 0;
  }

  const niTaxableAtMainRate = Math.min(grossIncome, niUpperLimit) - niThreshold;
  const niTaxableAtAdditionalRate = Math.max(0, grossIncome - niUpperLimit);

  return niTaxableAtMainRate * 0.08 + niTaxableAtAdditionalRate * 0.02;
}

// ============================================================================
// Capital Gains Tax Calculations
// ============================================================================

/**
 * Calculate Capital Gains Tax on disposals.
 * Accounts for the annual exempt amount and determines how much
 * gains fall into basic vs higher rate band based on total income.
 */
export function calculateCapitalGainsTax(
  gains: number,
  totalIncome: number,
  taxRates: TaxRates
): number {
  if (!taxRates || !taxRates.capitalGainsTax || !taxRates.bands) {
    return 0;
  }

  const { annualExemptAmount, basicRatePercent, higherRatePercent } =
    taxRates.capitalGainsTax;
  const basicRateBand = taxRates.bands[0]; // First band is basic rate

  // No tax if gains are within annual exempt amount
  if (gains <= annualExemptAmount) {
    return 0;
  }

  const taxableGains = gains - annualExemptAmount;

  // Calculate remaining basic rate band after income
  let remainingBasicRateBand = 0;
  if (basicRateBand?.bandEndAmount) {
    remainingBasicRateBand = Math.max(0, basicRateBand.bandEndAmount - totalIncome);
  }

  // Split gains between basic and higher rate
  const basicRateGains = Math.min(taxableGains, remainingBasicRateBand);
  const higherRateGains = taxableGains - basicRateGains;

  // Calculate tax
  const basicTax = basicRateGains * (basicRatePercent / 100);
  const higherTax = higherRateGains * (higherRatePercent / 100);

  return basicTax + higherTax;
}

/**
 * Calculate total tax liability including both income tax and CGT.
 */
export function calculateTotalTaxLiability(
  income: number,
  capitalGains: number,
  taxRates: TaxRates
): {
  incomeTax: number;
  capitalGainsTax: number;
  totalTax: number;
} {
  const incomeTax = calculateIncomeTax(income, taxRates);
  const capitalGainsTax = calculateCapitalGainsTax(capitalGains, income, taxRates);

  return {
    incomeTax,
    capitalGainsTax,
    totalTax: incomeTax + capitalGainsTax,
  };
}
