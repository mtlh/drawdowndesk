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

    // Add lastUpdated timestamp
    updates.lastUpdated = new Date().toISOString();

    await ctx.db.patch(id, updates);

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

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    return accounts.filter(a => a.portfolioId === args.portfolioId);
  },
});
