import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Get all dividends for the current user
export const getDividends = query({
  args: {
    portfolioId: v.optional(v.id("portfolios")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found.", dividends: [] };
    }

    const dividends = await ctx.db
      .query("dividends")
      .withIndex(args.portfolioId ? "by_userPortfolio" : "by_user", q =>
        args.portfolioId
          ? q.eq("userId", userId).eq("portfolioId", args.portfolioId!)
          : q.eq("userId", userId)
      )
      .collect();

    // Sort by symbol
    const sortedDividends = dividends.sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );

    return {
      dividends: sortedDividends,
    };
  },
});

// Add a dividend entry
export const addDividend = mutation({
  args: {
    symbol: v.string(),
    name: v.string(),
    portfolioId: v.optional(v.id("portfolios")),
    accountName: v.optional(v.string()),
    currency: v.optional(v.string()),
    shares: v.float64(),
    dividendPerShare: v.float64(),
    frequency: v.string(),
    paymentMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found.", dividendId: null };
    }

    const now = new Date().toISOString();

    const dividendId = await ctx.db.insert("dividends", {
      userId,
      symbol: args.symbol,
      name: args.name,
      portfolioId: args.portfolioId,
      accountName: args.accountName,
      currency: args.currency || "GBP",
      shares: args.shares,
      dividendPerShare: args.dividendPerShare,
      frequency: args.frequency,
      paymentMonth: args.paymentMonth,
      lastUpdated: now,
    });

    return { dividendId, error: null };
  },
});

// Update a dividend entry
export const updateDividend = mutation({
  args: {
    dividendId: v.id("dividends"),
    symbol: v.optional(v.string()),
    name: v.optional(v.string()),
    portfolioId: v.optional(v.id("portfolios")),
    accountName: v.optional(v.string()),
    currency: v.optional(v.string()),
    shares: v.optional(v.float64()),
    dividendPerShare: v.optional(v.float64()),
    frequency: v.optional(v.string()),
    paymentMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const dividend = await ctx.db.get(args.dividendId);
    if (!dividend) {
      return { error: "Dividend not found." };
    }

    // Verify ownership
    if (dividend.userId !== userId) {
      return { error: "Not authorized to update this dividend." };
    }

    const updates: Partial<typeof dividend> = {
      lastUpdated: new Date().toISOString(),
    };

    if (args.symbol !== undefined) updates.symbol = args.symbol;
    if (args.name !== undefined) updates.name = args.name;
    if (args.portfolioId !== undefined) updates.portfolioId = args.portfolioId;
    if (args.accountName !== undefined) updates.accountName = args.accountName;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.shares !== undefined) updates.shares = args.shares;
    if (args.dividendPerShare !== undefined) updates.dividendPerShare = args.dividendPerShare;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.paymentMonth !== undefined) updates.paymentMonth = args.paymentMonth;

    await ctx.db.patch(args.dividendId, updates);

    return { error: null };
  },
});

// Delete a dividend entry
export const deleteDividend = mutation({
  args: {
    dividendId: v.id("dividends"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const dividend = await ctx.db.get(args.dividendId);
    if (!dividend) {
      return { error: "Dividend not found." };
    }

    // Verify ownership
    if (dividend.userId !== userId) {
      return { error: "Not authorized to delete this dividend." };
    }

    await ctx.db.delete(args.dividendId);

    return { error: null };
  },
});
