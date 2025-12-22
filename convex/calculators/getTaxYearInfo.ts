import { query } from "../_generated/server";

export const getTaxYearInfo = query({
  handler: async (ctx) => {
    // Get the taxYeardocument
    const taxYear = await ctx.db
      .query("taxYears")
      .withIndex("by_year", (q) => q.eq("taxYear", new Date().getFullYear()))
      .first();

    if (!taxYear) return { error: "Tax year not found." };

    // Get personal allowance
    const allowance = await ctx.db
      .query("personalAllowances")
      .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYear._id))
      .first();
    if (!allowance) return { error: "Personal allowance not found for this year." };

    // Get tax bands that apply to the income
    const bands = await ctx.db
      .query("taxBands")
      .withIndex("by_band", (q) => q.eq("taxYearId", taxYear._id).eq("incomeType", "Employment"))
      .collect();

    const customOrder: { [key: string]: number } = {
        "Basic Rate": 0,
        "Higher Rate": 1,
        "Additional Rate": 2,
    };
    bands.sort((a, b) => customOrder[a.bandName] - customOrder[b.bandName]);

    if (!bands || bands.length === 0) return { error: "No tax bands found for this year." };

    // Get capital gains tax
    const capitalGainsTax = await ctx.db
      .query("capitalGainsTax")
      .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYear._id))
      .first();
    if (!capitalGainsTax) return { error: "Capital gains tax not found for this year." };

    return {
      taxYear: taxYear,
      personalAllowance: allowance,
      bands: bands,
      capitalGainsTax: capitalGainsTax,
    };
  },
});