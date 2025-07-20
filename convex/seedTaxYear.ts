import { mutation } from "../convex/_generated/server";

export const seedTaxInfo = mutation(async ({ db }) => {
  // Tax Year
  const taxYearId = await db.insert("taxYears", {
    taxYear: 2025,
    country: "UK",
    notes: "England/Wales/Northern Ireland baseline",
    lastUpdated: new Date().toISOString(),
  });

  // Personal Allowance
  await db.insert("personalAllowances", {
    taxYearId,
    amount: 12570,
    taperThreshold: 100000,
    taperRatePercent: 50, // Illustrative: lose £1 allowance for every £2 income over threshold
    lastUpdated: new Date().toISOString(),
  });

  // Income Tax Bands
  const bands = [
    {
      incomeType: "Employment",
      bandName: "Basic Rate",
      bandStartAmount: 12571,
      bandEndAmount: 50270,
      taxRatePercent: 20,
      nationalInsuranceRate: 8,
      additionalNotes: "Includes Class 1 employee rate",
    },
    {
      incomeType: "Employment",
      bandName: "Higher Rate",
      bandStartAmount: 50271,
      bandEndAmount: 125140,
      taxRatePercent: 40,
      nationalInsuranceRate: 2,
      additionalNotes: "NI drops to 2% above £50,270",
    },
    {
      incomeType: "Employment",
      bandName: "Additional Rate",
      bandStartAmount: 125141,
      bandEndAmount: undefined,
      taxRatePercent: 45,
      nationalInsuranceRate: 2,
      additionalNotes: "Top tax band, NI unchanged",
    },
  ];

  for (const band of bands) {
        await db.insert("taxBands", {taxYearId, ...band, lastUpdated: new Date().toISOString()});
    }

  // Capital Gains Tax
  await db.insert("capitalGainsTax", {
    taxYearId,
    assetType: "Shares",
    annualExemptAmount: 3000,
    basicRatePercent: 10,
    higherRatePercent: 20,
    lastUpdated: new Date().toISOString(),
  });

  await db.insert("capitalGainsTax", {
    taxYearId,
    assetType: "Residential Property",
    annualExemptAmount: 3000,
    basicRatePercent: 18,
    higherRatePercent: 28,
    lastUpdated: new Date().toISOString(),
  });

  return "Seeded UK 2025–2026 tax data successfully.";
});
