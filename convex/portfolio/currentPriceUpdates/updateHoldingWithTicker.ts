import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const getAllHoldings = query({
  handler: async (ctx) => {

    const oneDayMs = 24 * 60 * 60 * 1000; 
    const cutoff = Date.now() - oneDayMs; 
    
    const holdings = await ctx.db
      .query("holdings")
      .filter(q => q.gt(q.field("lastUpdated"), cutoff))
      .order("asc")
      .collect();

    return holdings.map((h) => ({
      symbol: h.symbol,
      exchange: h.exchange,
      currency: h.currency || "GBP",
    }));
  },
});

export const updateHoldingWithTicker = mutation({
  args: {
    symbol: v.string(),
    currentPrice: v.float64(),
    currency: v.optional(v.string()),
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
            currency: args.currency || holding.currency,
        });
      }
    }
    return { error: "Holding not found." };
  },
});
