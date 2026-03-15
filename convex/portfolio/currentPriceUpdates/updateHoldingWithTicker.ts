import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

export const getAllHoldings = query({
  handler: async (ctx) => {

    const sixHoursMs = 6 * 60 * 60 * 1000;
    const cutoff = Date.now() - sixHoursMs; 
    
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

export const getAllUserIdsWithHoldings = query({
  handler: async (ctx) => {
    const holdings = await ctx.db
      .query("holdings")
      .collect();

    const simpleHoldings = await ctx.db
      .query("simpleHoldings")
      .collect();

    const userIds = new Set<Id<"users">>();
    for (const h of holdings) {
      userIds.add(h.userId);
    }
    for (const h of simpleHoldings) {
      userIds.add(h.userId);
    }

    return Array.from(userIds);
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
