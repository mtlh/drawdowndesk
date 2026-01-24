import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const getAllHoldings = query({
  handler: async (ctx) => {

    const holdings = await ctx.db
      .query("holdings")
      .collect();

    return holdings.map((h) => ({
      symbol: h.symbol,
      currency: h.currency || "GBP",
    }));
  },
});

export const updateHoldingWithTicker = mutation({
  args: {
    symbol: v.string(),
    currentPrice: v.float64(),
  },

  handler: async (ctx, args) => {

    const existingHoldingsWithSymbol = await ctx.db
      .query("holdings")
      .withIndex("by_symbol", q => q.eq("symbol", args.symbol))
      .collect();

    if (existingHoldingsWithSymbol.length > 0) {
      for (const holding of existingHoldingsWithSymbol) {
        await ctx.db.replace(holding._id, {
            ...holding,
            currentPrice: args.currentPrice,
        });
      }
    }
    return { error: "Holding not found." };
  },
});
