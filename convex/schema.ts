import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

    tasks: defineTable({
        text: v.string(),
        isCompleted: v.optional(v.boolean()),
    }).index("by_completed", ["isCompleted"]),

    taxYears: defineTable({
        taxYear: v.number(),                         // e.g., 2025
        country: v.string(),                        // e.g., "UK"
        notes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    }).index("by_year", ["taxYear"]),

    personalAllowances: defineTable({
        taxYearId: v.id("taxYears"),
        amount: v.float64(),                         // e.g., £12,570
        taperThreshold: v.float64(),                // e.g., £100,000
        taperRatePercent: v.float64(),              // e.g., reduction rate
        lastUpdated: v.optional(v.string()),
    }).index("by_taxYear", ["taxYearId"]),

    taxBands: defineTable({
        taxYearId: v.id("taxYears"),
        incomeType: v.string(),                      // "Employment", "Savings", "Dividends"
        bandName: v.string(),                        // "Basic Rate", etc.
        bandStartAmount: v.float64(),
        bandEndAmount: v.optional(v.float64()),                 // null for open-ended bands
        taxRatePercent: v.float64(),
        nationalInsuranceRate: v.optional(v.float64()),
        additionalNotes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    }).index("by_band", ["taxYearId", "incomeType", "bandName"]),

    capitalGainsTax: defineTable({
        taxYearId: v.id("taxYears"),
        assetType: v.string(),                       // "Property", "Shares", etc.
        annualExemptAmount: v.float64(),             // e.g., £3,000
        basicRatePercent: v.float64(),               // e.g., 10%
        higherRatePercent: v.float64(),              // e.g., 20%
        lastUpdated: v.optional(v.string()),
    }).index("by_asset", ["taxYearId", "assetType"]),

    // Historical Returns for monte carlo simulations
    historicalReturns: defineTable({
        assetName: v.string(),                       // "MSCI All Cap", "S&P 500", "FTSE 100", etc.
        assetType: v.string(),                       // "Stock", "Bond", etc.
        returnYear: v.number(),                      // e.g., 2025
        returnAmount: v.float64(),                   // e.g., 6.5%
        lastUpdated: v.optional(v.string()),
    }).index("by_asset", ["assetName", "assetType"]),
});