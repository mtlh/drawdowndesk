import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
    }).index("by_taxYear", ["taxYearId"]),

    // Historical Returns for monte carlo simulations
    historicalReturns: defineTable({
        assetName: v.string(),                       // "MSCI All Cap", "S&P 500", "FTSE 100", etc.
        assetType: v.string(),                       // "Stock", "Bond", etc.
        returnYear: v.number(),                      // e.g., 2025
        returnAmount: v.float64(),                   // e.g., 6.5%
        lastUpdated: v.optional(v.string()),
    }).index("by_asset", ["assetName", "assetType"]),

    // User Portfolios
    portfolios: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        name: v.string(),                            // e.g., "My Portfolio"
        lastUpdated: v.optional(v.string()),
    }).index("by_userPorfolio", ["userId", "name"]),

    // User Portfolio Holdings
    holdings: defineTable({
        portfolioId: v.optional(v.id("portfolios")), // Foreign key to portfolio
        userId: v.id("users"),                          // Authenticated user ID
        symbol: v.string(),                          // e.g., "MSFT"
        name: v.string(),                            // e.g., "Microsoft Corporation"
        accountName: v.optional(v.string()),         // e.g., "S&S ISA"
        holdingType: v.string(),                     // e.g., "Stock", "Bond", "Commodity"
        shares: v.float64(),                         // e.g., 1000
        avgPrice: v.float64(),                       // e.g., 120.5
        currentPrice: v.float64(),                   // e.g., 118.2
        purchaseDate: v.string(),                    // e.g., "2022-03-15"
        lastUpdated: v.optional(v.string()),
    }).index("by_portfolio", ["userId", "portfolioId", "symbol"]),

    // Buy and sell events
    buySellEvents: defineTable({
        portfolioId: v.optional(v.id("portfolios")), // Foreign key to portfolio
        holdingId: v.optional(v.id("holdings")),     // Foreign key to holding
        userId: v.id("users"),                          // Authenticated user ID
        buyShares: v.float64(),                      // e.g., 1000 (buy positive, sell negative)
        purchaseDate: v.string(),                    // e.g., "2022-03-15"
        pricePerShare: v.float64(),                  // e.g., 120.5
        notes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    })
});