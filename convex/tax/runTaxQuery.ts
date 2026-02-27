import { query } from "../_generated/server";
import { v } from "convex/values";

export const getTaxInfoForIncome = query({
  args: {
    taxYear: v.number(),     // e.g., 2025
  },
  handler: async (ctx, args) => {

    // Get the taxYear document
    const year = await ctx.db
      .query("taxYears")
      .withIndex("by_year", (q) => q.eq("taxYear", args.taxYear))
      .first();
    if (!year) return { error: "Tax year not found." };

    const { _id: taxYearId } = year;

    // Get personal allowance
    const allowance = await ctx.db
      .query("personalAllowances")
      .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYearId))
      .first();
    if (!allowance) return { error: "Personal allowance not found for this year." };

    // Get tax bands that apply to the income
    const bands = await ctx.db
      .query("taxBands")
      .withIndex("by_band", (q) => q.eq("taxYearId", taxYearId).eq("incomeType", "Employment"))
      .collect();
    if (!bands || bands.length === 0) return { error: "No tax bands found for this year." };

    // Get capital gains tax
    const capitalGainsTax = await ctx.db
      .query("capitalGainsTax")
      .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYearId))
      .first();
    if (!capitalGainsTax) return { error: "Capital gains tax not found for this year." };

    return {
      taxYear: args.taxYear,
      personalAllowance: allowance,
      bands: bands,
      capitalGainsTax: capitalGainsTax,
    };
  },
});
