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

    // User Settings - State Pension and other preferences
    userSettings: defineTable({
        userId: v.id("users"),
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),  // User's theme preference
        statePensionAmount: v.float64(),                 // Annual state pension amount
        statePensionAge: v.number(),                    // State pension age
        isRetired: v.optional(v.boolean()),             // Whether user is retired (affects tax bands)
        defaultGrowthRate: v.optional(v.float64()),     // Default growth rate for projections (e.g., 5)
        defaultInflationRate: v.optional(v.float64()),  // Default inflation rate for projections (e.g., 2)
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // User Tax Overrides - Personal Allowance
    userTaxAllowances: defineTable({
        userId: v.id("users"),
        taxYear: v.number(),                        // e.g., 2025
        amount: v.float64(),                         // e.g., £12,570
        taperThreshold: v.float64(),                // e.g., £100,000
        taperRatePercent: v.float64(),              // e.g., 50
        isCustom: v.boolean(),                      // true if user has overridden
        lastUpdated: v.optional(v.string()),
    }).index("by_userYear", ["userId", "taxYear"]),

    // User Tax Overrides - Tax Bands
    userTaxBands: defineTable({
        userId: v.id("users"),
        taxYear: v.number(),                        // e.g., 2025
        incomeType: v.string(),                      // "Employment", "Savings", "Dividends"
        bandName: v.string(),                       // "Basic Rate", etc.
        bandStartAmount: v.float64(),
        bandEndAmount: v.optional(v.float64()),
        taxRatePercent: v.float64(),
        nationalInsuranceRate: v.optional(v.float64()),
        isCustom: v.boolean(),                      // true if user has overridden
        lastUpdated: v.optional(v.string()),
    }).index("by_userYear", ["userId", "taxYear"]),

    // User Tax Overrides - Capital Gains Tax
    userCapitalGainsTax: defineTable({
        userId: v.id("users"),
        taxYear: v.number(),                        // e.g., 2025
        assetType: v.string(),                      // "Property", "Shares", etc.
        annualExemptAmount: v.float64(),
        basicRatePercent: v.float64(),
        higherRatePercent: v.float64(),
        isCustom: v.boolean(),                      // true if user has overridden
        lastUpdated: v.optional(v.string()),
    }).index("by_userYear", ["userId", "taxYear"]),

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
        portfolioType: v.optional(v.union(v.literal("live"), v.literal("manual"))), // "live" for API-tracked, "manual" for pensions/OICS
        isSystem: v.optional(v.boolean()),            // System portfolios (benchmarks) - hidden from user
        benchmarkId: v.optional(v.string()),          // Benchmark identifier (e.g., "ACWI", "SP500", "GOLD")
        lastUpdated: v.optional(v.string()),
    }).index("by_userPorfolio", ["userId", "name"]).index("by_user", ["userId"]),

    // User Portfolio Holdings
    holdings: defineTable({
        portfolioId: v.optional(v.id("portfolios")), // Foreign key to portfolio
        userId: v.id("users"),                          // Authenticated user ID
        symbol: v.string(),                          // e.g., "MSFT"
        name: v.string(),                            // e.g., "Microsoft Corporation"
        accountName: v.optional(v.string()),         // e.g., "S&S ISA"
        dataType: v.optional(v.string()),             // "stock", "bond", "commodity", "crypto" for asset classification
        holdingType: v.optional(v.string()),         // deprecated, use dataType instead
        exchange: v.optional(v.string()),             // e.g., "LON", "NASDAQ", "LSE" for Twelve Data API
        currency: v.optional(v.string()),             // e.g., "USD", "GBp", "EUR"
        shares: v.float64(),                         // e.g., 1000
        avgPrice: v.float64(),                       // e.g., 120.5
        currentPrice: v.float64(),                   // e.g., 118.2
        purchaseDate: v.string(),                    // e.g., "2022-03-15"
        lastUpdated: v.optional(v.string()),
    }).index("by_portfolio", ["userId", "portfolioId"]).index("by_symbol", ["symbol"]).index("by_user_symbol", ["userId", "symbol"]).index("by_user", ["userId"]),

    // Simple holdings for manual portfolios (pensions, OICS, etc.)
    simpleHoldings: defineTable({
        portfolioId: v.id("portfolios"),              // Foreign key to portfolio
        userId: v.id("users"),                          // Authenticated user ID
        name: v.string(),                            // e.g., "Vanguard Global All Cap"
        value: v.float64(),                           // Total current value in GBP
        accountName: v.optional(v.string()),         // e.g., "S&S ISA", "Pension"
        dataType: v.optional(v.string()),             // "stock", "bond", "commodity", "crypto" for asset classification
        holdingType: v.optional(v.string()),         // deprecated, use dataType instead
        notes: v.optional(v.string()),                // Optional notes
        lastUpdated: v.optional(v.string()),
    }).index("by_portfolio", ["userId", "portfolioId"]).index("by_user", ["userId"]),

    // Buy and sell events
    buySellEvents: defineTable({
        portfolioId: v.optional(v.id("portfolios")), // Foreign key to portfolio
        holdingId: v.optional(v.id("holdings")),     // Foreign key to holding
        userId: v.id("users"),                          // Authenticated user ID
        symbol: v.string(),                          // e.g., "MSFT"
        name: v.string(),                            // e.g., "Microsoft Corporation"
        currency: v.optional(v.string()),            // e.g., "GBP", "USD", "GBp"
        buyShares: v.float64(),                      // e.g., 1000 (buy positive, sell negative)
        purchaseDate: v.string(),                    // e.g., "2022-03-15"
        pricePerShare: v.float64(),                  // e.g., 120.5
        notes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]).index("by_userPortfolio", ["userId", "portfolioId"]),

    // Dividend income tracking
    dividends: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        symbol: v.string(),                          // e.g., "MSFT"
        name: v.string(),                            // e.g., "Microsoft Corporation"
        portfolioId: v.optional(v.id("portfolios")), // Optional link to portfolio
        accountName: v.optional(v.string()),         // e.g., "S&S ISA"
        currency: v.optional(v.string()),            // e.g., "GBP", "USD", "GBp"
        shares: v.float64(),                         // Number of shares owned
        dividendPerShare: v.float64(),               // Dividend per share (annual)
        frequency: v.string(),                        // "annual", "quarterly", "monthly"
        paymentMonth: v.optional(v.number()),        // 1-12 for primary payment month
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]).index("by_userSymbol", ["userId", "symbol"]).index("by_userPortfolio", ["userId", "portfolioId"]),

    // Portfolio value snapshots for performance tracking
    portfolioSnapshots: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        portfolioId: v.optional(v.id("portfolios")),    // Optional portfolio ID for per-portfolio snapshots
        totalValue: v.float64(),                       // Total portfolio value in GBP
        costBasis: v.float64(),                        // Total cost basis (sum of avgPrice * shares)
        snapshotDate: v.string(),                      // Date of snapshot (YYYY-MM-DD)
        lastUpdated: v.optional(v.string()),
    }).index("by_userDate", ["userId", "snapshotDate"]).index("by_userPortfolioDate", ["userId", "portfolioId", "snapshotDate"]),

    // Holding price snapshots for performance tracking
    holdingSnapshots: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        symbol: v.string(),                            // Stock symbol
        price: v.float64(),                           // Price at snapshot time
        snapshotDate: v.string(),                      // Date of snapshot (YYYY-MM-DD)
        lastUpdated: v.optional(v.string()),
    }).index("by_userSymbolDate", ["userId", "symbol", "snapshotDate"]).index("by_symbolDate", ["symbol", "snapshotDate"]),

    // Net worth snapshots including all accounts
    netWorthSnapshots: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        investmentsValue: v.float64(),                 // Total investment portfolio value in GBP
        accountsValue: v.float64(),                    // Total value of non-investment accounts
        netWorth: v.float64(),                         // Total net worth (investments + accounts)
        snapshotDate: v.string(),                      // Date of snapshot (YYYY-MM-DD)
        lastUpdated: v.optional(v.string()),
    }).index("by_userDate", ["userId", "snapshotDate"]),

    // Non-investment accounts (bank accounts, savings, etc.)
    accounts: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        name: v.string(),                            // e.g., "NatWest Current Account"
        accountType: v.string(),                      // "bank", "savings", "pension", "crypto", "cash", "other"
        tag: v.optional(v.string()),                  // User-defined tag: "emergency fund", "house fund", "holiday", etc.
        value: v.float64(),                           // Current value in GBP
        portfolioId: v.optional(v.id("portfolios")),  // Optional link to investment portfolio for importing
        notes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]).index("by_user_portfolio", ["userId", "portfolioId"]),

    // Financial goals
    goals: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        name: v.string(),                            // e.g., "Wedding Fund"
        targetAmount: v.float64(),                   // Target amount in GBP
        currentAmount: v.float64(),                  // Current amount saved in GBP
        targetDate: v.string(),                       // Target date (YYYY-MM-DD)
        category: v.optional(v.string()),            // Category: "wedding", "house", "car", "holiday", "emergency", "retirement", "other"
        notes: v.optional(v.string()),
        isCompleted: v.boolean(),                     // Whether the goal has been reached
        completedDate: v.optional(v.string()),        // Date when goal was completed
        linkedPortfolioId: v.optional(v.id("portfolios")), // Optional link to portfolio for tracking
        autoSyncPortfolio: v.optional(v.boolean()),  // Auto-sync currentAmount from portfolio value
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // Lifetime Accumulation - yearly record of account values with age
    lifetimeAccumulations: defineTable({
        userId: v.id("users"),
        taxYear: v.number(),           // e.g., 2025
        userAge: v.number(),             // User's age during that tax year
        totalValue: v.float64(),        // Total account value at year end
        breakdown: v.optional(v.string()), // JSON: { "ISA": 50000, "Pension": 100000 }
        notes: v.optional(v.string()),
        lastUpdated: v.optional(v.string()),
    }).index("by_userYear", ["userId", "taxYear"]),

    // Continuous Contributions - monthly contributions per account for projections
    continuousContributions: defineTable({
        userId: v.id("users"),
        contributions: v.string(), // JSON: { "AccountName": 500, ... } - monthly contributions per account
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // User finance planning notes
    financeNotes: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        title: v.string(),                            // Title of the note
        content: v.string(),                          // Free-form content (markdown supported)
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // Retirement scenarios for "What-If" comparison
    scenarios: defineTable({
        userId: v.id("users"),                          // Authenticated user ID
        name: v.string(),                            // Scenario name, e.g., "Retire at 55"
        description: v.optional(v.string()),         // Optional description
        pensionValue: v.float64(),                   // Pension pot value
        isaValue: v.float64(),                        // ISA value
        giaValue: v.float64(),                        // GIA value
        growthRate: v.float64(),                     // Annual growth rate (percentage, e.g., 5 for 5%)
        withdrawalRate: v.float64(),                 // Withdrawal rate (percentage, e.g., 3 for 3%)
        startAge: v.number(),                         // Retirement start age
        statePension: v.float64(),                   // Annual state pension amount
        statePensionAge: v.number(),                 // State pension age
        lastUpdated: v.optional(v.string()),
    }).index("by_user", ["userId"]),
});