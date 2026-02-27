import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Save a portfolio snapshot with the current total value
export const savePortfolioSnapshot = mutation({
  args: {
    totalValue: v.float64(),
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
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Create new snapshot
      await ctx.db.insert("portfolioSnapshots", {
        userId,
        totalValue: args.totalValue,
        snapshotDate: today,
        lastUpdated: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

// Calculate total portfolio value and save snapshot in one mutation
export const calculateAndSaveSnapshot = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Get all portfolios for the user
    const portfolios = await ctx.db
      .query("portfolios")
      .withIndex("by_userPorfolio", q => q.eq("userId", userId))
      .collect();

    let totalValue = 0;

    for (const portfolio of portfolios) {
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
        totalValue += shares * currentPrice;
      }

      // Add value from simple holdings (manual portfolios like pensions/OICS)
      const simpleHoldings = await ctx.db
        .query("simpleHoldings")
        .withIndex("by_portfolio", q =>
          q.eq("userId", userId).eq("portfolioId", portfolio._id)
        )
        .collect();

      for (const simpleHolding of simpleHoldings) {
        totalValue += simpleHolding.value || 0;
      }
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if a snapshot already exists for today
    const existingSnapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId).eq("snapshotDate", today))
      .collect();

    if (existingSnapshots.length > 0) {
      await ctx.db.replace(existingSnapshots[0]._id, {
        ...existingSnapshots[0],
        totalValue,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("portfolioSnapshots", {
        userId,
        totalValue,
        snapshotDate: today,
        lastUpdated: new Date().toISOString(),
      });
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
