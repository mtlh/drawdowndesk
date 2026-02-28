import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Set user's personal allowance override
export const setUserTaxAllowance = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
    amount: v.float64(),
    taperThreshold: v.float64(),
    taperRatePercent: v.float64(),
  },
  handler: async (ctx, args) => {
    // Check if override already exists
    const existing = await ctx.db
      .query("userTaxAllowances")
      .withIndex("by_userYear", (q) => q.eq("userId", args.userId).eq("taxYear", args.taxYear))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        taperThreshold: args.taperThreshold,
        taperRatePercent: args.taperRatePercent,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
      return existing._id;
    } else {
      // Insert new
      return await ctx.db.insert("userTaxAllowances", {
        userId: args.userId,
        taxYear: args.taxYear,
        amount: args.amount,
        taperThreshold: args.taperThreshold,
        taperRatePercent: args.taperRatePercent,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

// Delete user's personal allowance override (reset to default)
export const deleteUserTaxAllowance = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userTaxAllowances")
      .withIndex("by_userYear", (q) => q.eq("userId", args.userId).eq("taxYear", args.taxYear))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Set user's tax band override
export const setUserTaxBand = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
    incomeType: v.string(),
    bandName: v.string(),
    bandStartAmount: v.float64(),
    bandEndAmount: v.optional(v.float64()),
    taxRatePercent: v.float64(),
    nationalInsuranceRate: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, incomeType, bandName, bandStartAmount, bandEndAmount, taxRatePercent, nationalInsuranceRate } = args;

    // Check if override already exists for this band
    const allBands = await ctx.db
      .query("userTaxBands")
      .withIndex("by_userYear", (q) => q.eq("userId", userId).eq("taxYear", taxYear))
      .collect();

    const existing = allBands.find((b) => b.incomeType === incomeType && b.bandName === bandName);

    if (existing) {
      await ctx.db.patch(existing._id, {
        bandStartAmount,
        bandEndAmount,
        taxRatePercent,
        nationalInsuranceRate,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userTaxBands", {
        userId,
        taxYear,
        incomeType,
        bandName,
        bandStartAmount,
        bandEndAmount,
        taxRatePercent,
        nationalInsuranceRate,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

// Delete user's tax band override
export const deleteUserTaxBand = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
    incomeType: v.string(),
    bandName: v.string(),
  },
  handler: async (ctx, args) => {
    const allBands = await ctx.db
      .query("userTaxBands")
      .withIndex("by_userYear", (q) => q.eq("userId", args.userId).eq("taxYear", args.taxYear))
      .collect();

    const existing = allBands.find((b) => b.incomeType === args.incomeType && b.bandName === args.bandName);

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Set user's CGT override
export const setUserCapitalGainsTax = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
    assetType: v.string(),
    annualExemptAmount: v.float64(),
    basicRatePercent: v.float64(),
    higherRatePercent: v.float64(),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, assetType, annualExemptAmount, basicRatePercent, higherRatePercent } = args;

    // Check if override already exists
    const allCgt = await ctx.db
      .query("userCapitalGainsTax")
      .withIndex("by_userYear", (q) => q.eq("userId", userId).eq("taxYear", taxYear))
      .collect();

    const existing = allCgt.find((c) => c.assetType === assetType);

    if (existing) {
      await ctx.db.patch(existing._id, {
        annualExemptAmount,
        basicRatePercent,
        higherRatePercent,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userCapitalGainsTax", {
        userId,
        taxYear,
        assetType,
        annualExemptAmount,
        basicRatePercent,
        higherRatePercent,
        isCustom: true,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

// Delete user's CGT override
export const deleteUserCapitalGainsTax = mutation({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
    assetType: v.string(),
  },
  handler: async (ctx, args) => {
    const allCgt = await ctx.db
      .query("userCapitalGainsTax")
      .withIndex("by_userYear", (q) => q.eq("userId", args.userId).eq("taxYear", args.taxYear))
      .collect();

    const existing = allCgt.find((c) => c.assetType === args.assetType);

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get user's tax overrides
export const getUserTaxOverrides = query({
  args: {
    userId: v.id("users"),
    taxYear: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear } = args;

    // Get user overrides
    const allowance = await ctx.db
      .query("userTaxAllowances")
      .withIndex("by_userYear", (q) => q.eq("userId", userId).eq("taxYear", taxYear))
      .first();

    const bands = await ctx.db
      .query("userTaxBands")
      .withIndex("by_userYear", (q) => q.eq("userId", userId).eq("taxYear", taxYear))
      .collect();

    const cgt = await ctx.db
      .query("userCapitalGainsTax")
      .withIndex("by_userYear", (q) => q.eq("userId", userId).eq("taxYear", taxYear))
      .collect();

    return {
      hasAllowanceOverride: !!allowance,
      allowance: allowance,
      hasBandOverrides: bands.length > 0,
      bands: bands,
      hasCgtOverrides: cgt.length > 0,
      cgt: cgt,
    };
  },
});
