import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Save a portfolio snapshot with the current total value
export const savePortfolioSnapshot = mutation({
  args: {
    totalValue: v.float64(),
    costBasis: v.float64(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if a snapshot already exists for today
    const existingSnapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId).eq("snapshotDate", today))
      .collect();

    if (existingSnapshots.length > 0) {
      // Update existing snapshot
      await ctx.db.replace(existingSnapshots[0]._id, {
        ...existingSnapshots[0],
        totalValue: args.totalValue,
        costBasis: args.costBasis,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Create new snapshot
      await ctx.db.insert("portfolioSnapshots", {
        userId,
        totalValue: args.totalValue,
        costBasis: args.costBasis,
        snapshotDate: today,
        lastUpdated: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

// Calculate total portfolio value and save snapshot in one mutation
export const calculateAndSaveSnapshot = mutation({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Try to get userId from auth, or use provided userId (for API calls)
    let userId = await getAuthUserId(ctx);
    if (!userId && args.userId) {
      userId = args.userId;
    }
    if (!userId) {
      return { error: "User not found." };
    }

    // Get all portfolios for the user
    const portfolios = await ctx.db
      .query("portfolios")
      .withIndex("by_userPorfolio", q => q.eq("userId", userId))
      .collect();

    // Fetch all holdings and simpleHoldings upfront to avoid N+1 queries
    const allHoldings = await ctx.db
      .query("holdings")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    const allSimpleHoldings = await ctx.db
      .query("simpleHoldings")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    // Group holdings by portfolioId (filtering out undefined portfolioId)
    const holdingsByPortfolio = new Map<Id<"portfolios">, typeof allHoldings>();
    for (const holding of allHoldings) {
      if (holding.portfolioId) {
        const existing = holdingsByPortfolio.get(holding.portfolioId) || [];
        existing.push(holding);
        holdingsByPortfolio.set(holding.portfolioId, existing);
      }
    }

    // Group simpleHoldings by portfolioId
    const simpleHoldingsByPortfolio = new Map<Id<"portfolios">, typeof allSimpleHoldings>();
    for (const holding of allSimpleHoldings) {
      const existing = simpleHoldingsByPortfolio.get(holding.portfolioId) || [];
      existing.push(holding);
      simpleHoldingsByPortfolio.set(holding.portfolioId, existing);
    }

    let totalValue = 0;
    let totalCostBasis = 0;
    const portfolioValues: { portfolioId: Id<"portfolios">; value: number; costBasis: number }[] = [];

    for (const portfolio of portfolios) {
      let portfolioValue = 0;
      let portfolioCostBasis = 0;

      // Use pre-fetched holdings
      const holdings = holdingsByPortfolio.get(portfolio._id) || [];

      for (const holding of holdings) {
        const shares = holding.shares || 0;
        const currentPrice = holding.currentPrice || 0;
        const avgPrice = holding.avgPrice || 0;
        const holdingValue = shares * currentPrice;
        const holdingCostBasis = shares * avgPrice;
        portfolioValue += holdingValue;
        portfolioCostBasis += holdingCostBasis;
        totalValue += holdingValue;
        totalCostBasis += holdingCostBasis;
      }

      // Use pre-fetched simple holdings
      const simpleHoldings = simpleHoldingsByPortfolio.get(portfolio._id) || [];

      for (const simpleHolding of simpleHoldings) {
        const holdingValue = simpleHolding.value || 0;
        portfolioValue += holdingValue;
        portfolioCostBasis += holdingValue;
        totalValue += holdingValue;
        totalCostBasis += holdingValue;
      }

      portfolioValues.push({ portfolioId: portfolio._id, value: portfolioValue, costBasis: portfolioCostBasis });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get all snapshots for today to check what exists
    const allTodaySnapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId).eq("snapshotDate", today))
      .collect();

    // Find total snapshot (one without portfolioId)
    const existingTotalSnapshot = allTodaySnapshots.find(s => !s.portfolioId);

    if (existingTotalSnapshot) {
      await ctx.db.replace(existingTotalSnapshot._id, {
        ...existingTotalSnapshot,
        totalValue,
        costBasis: totalCostBasis,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("portfolioSnapshots", {
        userId,
        totalValue,
        costBasis: totalCostBasis,
        snapshotDate: today,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Reuse allTodaySnapshots from above instead of querying again
    const allPortfolioSnapshots = allTodaySnapshots;

    // Group snapshots by portfolioId
    const snapshotsByPortfolioId = new Map<Id<"portfolios">, typeof allPortfolioSnapshots>();
    for (const snapshot of allPortfolioSnapshots) {
      if (snapshot.portfolioId) {
        const existing = snapshotsByPortfolioId.get(snapshot.portfolioId) || [];
        existing.push(snapshot);
        snapshotsByPortfolioId.set(snapshot.portfolioId, existing);
      }
    }

    // Save per-portfolio snapshots
    for (const pv of portfolioValues) {
      const existingPortfolioSnapshots = snapshotsByPortfolioId.get(pv.portfolioId) || [];

      if (existingPortfolioSnapshots.length > 0) {
        await ctx.db.replace(existingPortfolioSnapshots[0]._id, {
          ...existingPortfolioSnapshots[0],
          totalValue: pv.value,
          costBasis: pv.costBasis,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("portfolioSnapshots", {
          userId,
          portfolioId: pv.portfolioId,
          totalValue: pv.value,
          costBasis: pv.costBasis,
          snapshotDate: today,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    return { success: true, totalValue };
  },
});

// Get portfolio snapshots for the last N months
export const getPortfolioSnapshots = query({
  args: {
    months: v.optional(v.number()),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const months = args.months || 12;
    const limit = args.limit || 365; // Default to 1 year, max 365
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    let query = ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId))
      .filter(q => q.gte(q.field("snapshotDate"), cutoffStr));

    // Apply limit by taking from the end (most recent)
    const allSnapshots = await query.order("asc").collect();

    // Return most recent N snapshots
    return allSnapshots.slice(-limit);
  },
});

// Get snapshots for a specific portfolio with date range filtering
export const getPortfolioPerformanceSnapshots = query({
  args: {
    portfolioId: v.id("portfolios"),
    range: v.optional(v.union(v.literal("5D"), v.literal("1W"), v.literal("1M"), v.literal("YTD"), v.literal("1Y"))),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const range = args.range || "1M";
    const limit = args.limit || 365;
    const today = new Date();
    let cutoffDate: Date;

    switch (range) {
      case "5D":
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 5);
        break;
      case "1W":
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case "1M":
        cutoffDate = new Date(today);
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case "YTD":
        cutoffDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "1Y":
      default:
        cutoffDate = new Date(today);
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
    }

    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const allSnapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userPortfolioDate", q =>
        q.eq("userId", userId).eq("portfolioId", args.portfolioId)
      )
      .filter(q => q.gte(q.field("snapshotDate"), cutoffStr))
      .order("asc")
      .collect();

    // Return most recent N snapshots
    return allSnapshots.slice(-limit);
  },
});

// Get all snapshots for a specific portfolio (no date limit, for client-side timeline filtering)
export const getPortfolioSnapshotsByPortfolio = query({
  args: {
    portfolioId: v.id("portfolios"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const limit = args.limit || 365;

    const allSnapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userPortfolioDate", q =>
        q.eq("userId", userId).eq("portfolioId", args.portfolioId)
      )
      .order("asc")
      .collect();

    return allSnapshots.slice(-limit);
  },
});
