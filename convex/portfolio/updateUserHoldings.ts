import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Holding } from "@/types/portfolios";

export const updateUserHolding = mutation({
  args: {
    _id: v.optional(v.string()),
    portfolioId: v.id("portfolios"),
    symbol: v.string(),
    name: v.string(),
    accountName: v.optional(v.string()),
    holdingType: v.string(),
    dataType: v.optional(v.string()),
    exchange: v.optional(v.string()),
    currency: v.optional(v.string()),
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
      .withIndex("by_portfolio", q => q.eq("userId", userId).eq("portfolioId", args.portfolioId))
      .collect();

    let existingHolding: Holding | undefined;
    for (const holding of existing) {
      if (holding._id === args._id) {
        existingHolding = holding;
        break;
      }
    }

    const now = new Date().toISOString();

    // 2. Insert if missing
    if (!existingHolding) {
      await ctx.db.insert("holdings", {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        holdingType: args.holdingType,
        dataType: args.dataType || "etf",
        exchange: args.exchange,
        currency: args.currency || "GBP",
        shares: args.shares,
        avgPrice: args.avgPrice,
        currentPrice: args.currentPrice,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });

      return { created: true };
    }

    // 3. Update if present
    if (existingHolding._id) {
      await ctx.db.replace(existingHolding._id, {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        holdingType: args.holdingType,
        dataType: args.dataType || "etf",
        exchange: args.exchange,
        currency: args.currency || "GBP",
        shares: args.shares,
        avgPrice: args.avgPrice,
        currentPrice: args.currentPrice,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });
      return { updated: true };
    }

    return { error: "Holding not found." };
  },
});
