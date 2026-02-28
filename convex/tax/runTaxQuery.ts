import { query } from "../_generated/server";
import { v } from "convex/values";

export const getTaxInfoForIncome = query({
  args: {
    taxYear: v.number(),     // e.g., 2025
    userId: v.optional(v.id("users")),  // Optional userId for custom overrides
  },
  handler: async (ctx, args) => {

    // Get the taxYear document
    const year = await ctx.db
      .query("taxYears")
      .withIndex("by_year", (q) => q.eq("taxYear", args.taxYear))
      .first();
    if (!year) return { error: "Tax year not found." };

    const { _id: taxYearId } = year;

    // Check for user override on personal allowance
    let allowance;
    if (args.userId) {
      const userAllowance = await ctx.db
        .query("userTaxAllowances")
        .withIndex("by_userYear", (q) => q.eq("userId", args.userId!).eq("taxYear", args.taxYear))
        .first();
      allowance = userAllowance;
    }

    // Fall back to default if no override
    if (!allowance) {
      allowance = await ctx.db
        .query("personalAllowances")
        .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYearId))
        .first();
      if (!allowance) return { error: "Personal allowance not found for this year." };
    }

    // Check for user overrides on tax bands
    let bands;
    if (args.userId) {
      const userBands = await ctx.db
        .query("userTaxBands")
        .withIndex("by_userYear", (q) => q.eq("userId", args.userId!).eq("taxYear", args.taxYear))
        .collect();
      if (userBands.length > 0) {
        bands = userBands;
      }
    }

    // Fall back to defaults if no overrides
    if (!bands || bands.length === 0) {
      bands = await ctx.db
        .query("taxBands")
        .withIndex("by_band", (q) => q.eq("taxYearId", taxYearId).eq("incomeType", "Employment"))
        .collect();
      if (!bands || bands.length === 0) return { error: "No tax bands found for this year." };
    }

    // Check for user overrides on CGT
    let capitalGainsTax;
    if (args.userId) {
      const userCgt = await ctx.db
        .query("userCapitalGainsTax")
        .withIndex("by_userYear", (q) => q.eq("userId", args.userId!).eq("taxYear", args.taxYear))
        .collect();
      if (userCgt.length > 0) {
        capitalGainsTax = userCgt;
      }
    }

    // Fall back to defaults if no overrides
    if (!capitalGainsTax || capitalGainsTax.length === 0) {
      const defaultCgt = await ctx.db
        .query("capitalGainsTax")
        .withIndex("by_taxYear", (q) => q.eq("taxYearId", taxYearId))
        .collect();
      if (!defaultCgt || defaultCgt.length === 0) return { error: "Capital gains tax not found for this year." };
      capitalGainsTax = defaultCgt;
    }

    return {
      taxYear: args.taxYear,
      personalAllowance: allowance,
      bands: bands,
      capitalGainsTax: capitalGainsTax,
    };
  },
});
