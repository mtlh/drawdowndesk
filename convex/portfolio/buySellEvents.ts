import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Get all buy/sell events for the current user
export const getBuySellEvents = query({
  args: {
    portfolioId: v.optional(v.id("portfolios")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    let events;
    if (args.portfolioId) {
      events = await ctx.db
        .query("buySellEvents")
        .withIndex("by_userPortfolio", q =>
          q.eq("userId", userId).eq("portfolioId", args.portfolioId!)
        )
        .collect();
    } else {
      events = await ctx.db
        .query("buySellEvents")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect();
    }

    // Sort by date descending (most recent first)
    return events.sort((a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  },
});

// Add a buy/sell event and update/create the corresponding holding
export const addBuySellEvent = mutation({
  args: {
    portfolioId: v.id("portfolios"),
    symbol: v.string(),
    name: v.string(),
    currency: v.optional(v.string()),
    accountName: v.optional(v.string()),
    buyShares: v.float64(),
    purchaseDate: v.string(),
    pricePerShare: v.float64(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const now = new Date().toISOString();
    const currency = args.currency || "GBP";

    // 1. Find existing holding by symbol in the portfolio
    const existingHoldings = await ctx.db
      .query("holdings")
      .withIndex("by_portfolio", q =>
        q.eq("userId", userId).eq("portfolioId", args.portfolioId)
      )
      .collect();

    const existingHolding = existingHoldings.find(h => h.symbol === args.symbol);
    let holdingId: Id<"holdings"> | undefined;
    let isNewHolding = false;
    let eventCurrency = currency;

    // 2. Update or create the holding
    if (existingHolding) {
      holdingId = existingHolding._id;
      // Use existing holding's currency
      eventCurrency = existingHolding.currency || "GBP";

      // Calculate new average price and shares
      const currentShares = existingHolding.shares;
      const currentAvgPrice = existingHolding.avgPrice;
      const newShares = args.buyShares;
      const newPrice = args.pricePerShare;

      let updatedShares: number;
      let updatedAvgPrice: number;

      if (newShares > 0) {
        // Buying more shares
        const totalCost = (currentShares * currentAvgPrice) + (newShares * newPrice);
        updatedShares = currentShares + newShares;
        updatedAvgPrice = totalCost / updatedShares;
      } else {
        // Selling shares
        updatedShares = currentShares + newShares; // newShares is negative for sells
        updatedAvgPrice = currentAvgPrice; // Keep average price for remaining shares
      }

      // Don't allow negative shares
      if (updatedShares < 0) {
        return { error: "Cannot sell more shares than you own." };
      }

      // Delete holding if shares become zero
      if (updatedShares === 0) {
        await ctx.db.delete(existingHolding._id);
        holdingId = undefined;
      } else {
        await ctx.db.replace(existingHolding._id, {
          ...existingHolding,
          shares: updatedShares,
          avgPrice: updatedAvgPrice,
          currentPrice: newPrice, // Update current price to latest
          lastUpdated: now,
        });
      }
    } else if (args.buyShares > 0) {
      // Creating a new holding (only for buys, not sells)
      const newHolding = await ctx.db.insert("holdings", {
        userId,
        portfolioId: args.portfolioId,
        symbol: args.symbol,
        name: args.name,
        accountName: args.accountName,
        holdingType: "Stock",
        dataType: "stock",
        currency: currency,
        shares: args.buyShares,
        avgPrice: args.pricePerShare,
        currentPrice: args.pricePerShare,
        purchaseDate: args.purchaseDate,
        lastUpdated: now,
      });
      holdingId = newHolding;
      isNewHolding = true;
    } else {
      return { error: "Cannot sell a holding that doesn't exist." };
    }

    // 3. Insert the buy/sell event
    const eventId = await ctx.db.insert("buySellEvents", {
      userId,
      portfolioId: args.portfolioId,
      holdingId,
      symbol: args.symbol,
      name: args.name,
      currency: eventCurrency,
      buyShares: args.buyShares,
      purchaseDate: args.purchaseDate,
      pricePerShare: args.pricePerShare,
      notes: args.notes,
      lastUpdated: now,
    });

    return {
      success: true,
      eventId,
      holdingId,
      isNewHolding,
    };
  },
});

// Delete a buy/sell event (and reverse the holding update)
export const deleteBuySellEvent = mutation({
  args: {
    eventId: v.id("buySellEvents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== userId) {
      return { error: "Event not found." };
    }

    // Reverse the holding update
    if (event.holdingId) {
      const holding = await ctx.db.get(event.holdingId);
      if (holding) {
        const now = new Date().toISOString();
        const newShares = holding.shares - event.buyShares;

        if (newShares <= 0) {
          // Delete the holding if shares become zero or negative
          await ctx.db.delete(holding._id);
        } else {
          // Recalculate average price
          const totalCost = (holding.shares * holding.avgPrice) - (event.buyShares * event.pricePerShare);
          const newAvgPrice = totalCost / newShares;

          await ctx.db.replace(holding._id, {
            ...holding,
            shares: newShares,
            avgPrice: Math.max(0, newAvgPrice),
            lastUpdated: now,
          });
        }
      }
    }

    // Delete the event
    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});
