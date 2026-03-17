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

    // 1. Verify portfolio belongs to the user before any operations
    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      return { error: "Portfolio not found or access denied." };
    }

    // 2. Find existing holding using composite index
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

    // 3. Insert if missing
    if (!existingHolding) {
      const holdingId = await ctx.db.insert("holdings", {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        dataType: args.dataType || "stock",
        exchange: args.exchange,
        currency: args.currency || "GBP",
        shares: args.shares,
        avgPrice: args.avgPrice,
        currentPrice: args.currentPrice,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });

      // Log the initial buy transaction
      await ctx.db.insert("buySellEvents", {
        userId,
        portfolioId: args.portfolioId,
        holdingId,
        symbol: args.symbol,
        name: args.name,
        buyShares: args.shares,
        purchaseDate: args.purchaseDate,
        pricePerShare: args.avgPrice,
        notes: "Initial purchase",
        lastUpdated: now,
      });

      return { created: true };
    }

    // 4. Update if present
    if (existingHolding._id) {
      // Calculate the difference in shares to log as transaction
      const shareDifference = args.shares - existingHolding.shares;

      await ctx.db.replace(existingHolding._id, {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        dataType: args.dataType || "stock",
        exchange: args.exchange,
        currency: args.currency || "GBP",
        shares: args.shares,
        avgPrice: args.avgPrice,
        currentPrice: args.currentPrice,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });

      // Log the transaction (buy if positive, sell if negative)
      if (shareDifference !== 0) {
        await ctx.db.insert("buySellEvents", {
          userId,
          portfolioId: args.portfolioId,
          holdingId: existingHolding._id,
          symbol: args.symbol,
          name: args.name,
          buyShares: shareDifference,
          purchaseDate: args.purchaseDate,
          pricePerShare: args.currentPrice,
          notes: shareDifference > 0 ? "Buy (holding update)" : "Sell (holding update)",
          lastUpdated: now,
        });
      }

      return { updated: true };
    }

    return { error: "Holding not found." };
  },
});
