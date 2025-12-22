import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateUserHolding = mutation({
  args: {
    portfolioId: v.id("portfolios"),
    symbol: v.string(),
    name: v.string(),
    accountName: v.optional(v.string()),
    holdingType: v.string(),
    shares: v.float64(),
    avgPrice: v.float64(),
    currentPrice: v.float64(),
    purchaseDate: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // 1. Find existing holding using composite index
    const existing = await ctx.db
      .query("holdings")
      .withIndex("by_portfolio", q =>
        q.eq("userId", userId)
         .eq("portfolioId", args.portfolioId)
      )
      .first();

    const now = new Date().toISOString();

    // 2. Insert if missing
    if (!existing) {
      await ctx.db.insert("holdings", {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        holdingType: args.holdingType,
        shares: args.shares,
        avgPrice: args.avgPrice,
        currentPrice: args.currentPrice,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });

      return { created: true };
    }

    // 3. Update if present
    await ctx.db.replace(existing._id, {
      userId,
      portfolioId: args.portfolioId,
      symbol: args.symbol,
      name: args.name,
      accountName: args.accountName,
      holdingType: args.holdingType,
      shares: args.shares,
      avgPrice: args.avgPrice,
      currentPrice: args.currentPrice,
      purchaseDate: args.purchaseDate,
      lastUpdated: now,
    });

    return { updated: true };
  },
});
