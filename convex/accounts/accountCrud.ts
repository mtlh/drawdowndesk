import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get all accounts for the user
export const getUserAccounts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    // Also get portfolios for linking
    const portfolios = await ctx.db
      .query("portfolios")
      .withIndex("by_userPorfolio", q => q.eq("userId", userId))
      .collect();

    // Add portfolio names to accounts
    const portfolioMap = new Map(portfolios.map(p => [p._id, p.name]));
    const accountsWithPortfolio = accounts.map(account => ({
      ...account,
      portfolioName: account.portfolioId ? portfolioMap.get(account.portfolioId) : undefined,
    }));

    return { accounts: accountsWithPortfolio, portfolios };
  },
});

// Simplified query for pages that don't need full portfolio data
export const getAccountsForNetWorth = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    // Get only portfolio names for linking (not full portfolio objects)
    const portfolios = await ctx.db
      .query("portfolios")
      .withIndex("by_userPorfolio", q => q.eq("userId", userId))
      .collect();

    const portfolioMap = new Map(portfolios.map(p => [p._id, p.name]));
    return accounts.map(account => ({
      _id: account._id,
      userId: account.userId,
      name: account.name,
      accountType: account.accountType,
      tag: account.tag,
      value: account.value,
      portfolioId: account.portfolioId,
      notes: account.notes,
      lastUpdated: account.lastUpdated,
      portfolioName: account.portfolioId ? portfolioMap.get(account.portfolioId) : undefined,
    }));
  },
});

// Create a new account
export const createAccount = mutation({
  args: {
    name: v.string(),
    accountType: v.string(),
    tag: v.optional(v.string()),
    value: v.float64(),
    portfolioId: v.optional(v.id("portfolios")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const accountId = await ctx.db.insert("accounts", {
      userId,
      name: args.name,
      accountType: args.accountType,
      tag: args.tag,
      value: args.value,
      portfolioId: args.portfolioId,
      notes: args.notes,
      lastUpdated: new Date().toISOString(),
    });

    return { accountId };
  },
});

// Update an existing account
export const updateAccount = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    accountType: v.optional(v.string()),
    tag: v.optional(v.string()),
    value: v.optional(v.float64()),
    portfolioId: v.optional(v.id("portfolios")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const { id, ...updates } = args;

    // Verify ownership before updating
    const account = await ctx.db.get(id);
    if (!account || account.userId !== userId) {
      return { error: "Account not found or access denied." };
    }

    // Add lastUpdated timestamp
    await ctx.db.patch(id, { ...updates, lastUpdated: new Date().toISOString() });

    return { success: true };
  },
});

// Delete an account
export const deleteAccount = mutation({
  args: {
    id: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Verify ownership before deleting
    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== userId) {
      return { error: "Account not found or access denied." };
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Get accounts linked to a portfolio (for importing)
export const getAccountsByPortfolio = query({
  args: {
    portfolioId: v.id("portfolios"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Use index to filter directly in database instead of fetching all and filtering in JS
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user_portfolio", q =>
        q.eq("userId", userId).eq("portfolioId", args.portfolioId)
      )
      .collect();

    return accounts;
  },
});
