import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Calculate total portfolio value and save net worth snapshot
export const calculateAndSaveNetWorthSnapshot = mutation({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let userId = await getAuthUserId(ctx);
    if (!userId && args.userId) {
      userId = args.userId;
    }
    if (!userId) {
      return { error: "User not found." };
    }

    let investmentsValue = 0;

    // Get all live holdings for the user (regardless of portfolioId)
    const allHoldings = await ctx.db
      .query("holdings")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    for (const holding of allHoldings) {
      const shares = holding.shares || 0;
      let currentPrice = holding.currentPrice || 0;

      // Convert GBp (pence) to GBP (pounds)
      if (holding.currency === "GBp") {
        currentPrice = currentPrice / 100;
      }

      investmentsValue += shares * currentPrice;
    }

    // Get all simple holdings for the user
    const allSimpleHoldings = await ctx.db
      .query("simpleHoldings")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    for (const simpleHolding of allSimpleHoldings) {
      investmentsValue += simpleHolding.value || 0;
    }

    // Get all accounts for net worth calculation
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    let accountsValue = 0;
    for (const account of accounts) {
      accountsValue += account.value || 0;
    }

    const netWorth = investmentsValue + accountsValue;
    const today = new Date().toISOString().split("T")[0];

    // Delete any existing snapshot for today and create a fresh one
    const existingSnapshots = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId).eq("snapshotDate", today))
      .collect();

    for (const snapshot of existingSnapshots) {
      await ctx.db.delete(snapshot._id);
    }

    // Insert new snapshot with fresh data
    await ctx.db.insert("netWorthSnapshots", {
      userId,
      investmentsValue,
      accountsValue,
      netWorth,
      snapshotDate: today,
      lastUpdated: new Date().toISOString(),
    });

    return { success: true, investmentsValue, accountsValue, netWorth };
  },
});

// Get net worth snapshots for the last N months
export const getNetWorthSnapshots = query({
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
      .query("netWorthSnapshots")
      .withIndex("by_userDate", q => q.eq("userId", userId))
      .filter(q => q.gte(q.field("snapshotDate"), cutoffStr))
      .order("asc")
      .collect();

    return snapshots;
  },
});
