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

    let totalValue = 0;
    let totalCostBasis = 0;
    const portfolioValues: { portfolioId: Id<"portfolios">; value: number; costBasis: number }[] = [];

    for (const portfolio of portfolios) {
      let portfolioValue = 0;
      let portfolioCostBasis = 0;

      // Add value from live holdings
      const holdings = await ctx.db
        .query("holdings")
        .withIndex("by_portfolio", q =>
          q.eq("userId", userId).eq("portfolioId", portfolio._id)
        )
        .collect();

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

      // Add value from simple holdings (manual portfolios like pensions/OICS)
      const simpleHoldings = await ctx.db
        .query("simpleHoldings")
        .withIndex("by_portfolio", q =>
          q.eq("userId", userId).eq("portfolioId", portfolio._id)
        )
        .collect();

      for (const simpleHolding of simpleHoldings) {
        const holdingValue = simpleHolding.value || 0;
        portfolioValue += holdingValue;
        // Simple holdings don't have avgPrice, so use current value as cost basis
        // This means no unrealized gains/losses tracked for manual holdings
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

    // Save per-portfolio snapshots
    for (const pv of portfolioValues) {
      // Query specifically for this portfolio's snapshot using the new index
      const existingPortfolioSnapshots = await ctx.db
        .query("portfolioSnapshots")
        .withIndex("by_userPortfolioDate", q =>
          q.eq("userId", userId)
           .eq("portfolioId", pv.portfolioId)
           .eq("snapshotDate", today)
        )
        .collect();

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
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const months = args.months || 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const snapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId))
      .filter(q => q.gte(q.field("snapshotDate"), cutoffStr))
      .order("asc")
      .collect();

    return snapshots;
  },
});

// Get snapshots for a specific portfolio with date range filtering
export const getPortfolioPerformanceSnapshots = query({
  args: {
    portfolioId: v.id("portfolios"),
    range: v.optional(v.union(v.literal("1D"), v.literal("1W"), v.literal("1M"), v.literal("YTD"), v.literal("1Y"))),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const range = args.range || "1M";
    const today = new Date();
    let cutoffDate: Date;

    switch (range) {
      case "1D":
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 1);
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

    const snapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userPortfolioDate", q =>
        q.eq("userId", userId).eq("portfolioId", args.portfolioId)
      )
      .filter(q => q.gte(q.field("snapshotDate"), cutoffStr))
      .order("asc")
      .collect();

    return snapshots;
  },
});

