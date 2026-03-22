import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const expenses = await ctx.db
      .query("budgetExpenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return expenses;
  },
});

export const createExpense = mutation({
  args: {
    name: v.string(),
    amount: v.float64(),
    category: v.string(),
    categoryType: v.union(v.literal("need"), v.literal("want")),
    isRecurring: v.boolean(),
    icon: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const expenseId = await ctx.db.insert("budgetExpenses", {
      userId,
      name: args.name,
      amount: args.amount,
      category: args.category,
      categoryType: args.categoryType,
      isRecurring: args.isRecurring,
      icon: args.icon,
      notes: args.notes,
      lastUpdated: new Date().toISOString(),
    });

    return expenseId;
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("budgetExpenses"),
    name: v.optional(v.string()),
    amount: v.optional(v.float64()),
    category: v.optional(v.string()),
    categoryType: v.optional(v.union(v.literal("need"), v.literal("want"))),
    isRecurring: v.optional(v.boolean()),
    icon: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { expenseId, ...updates } = args;

    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found or unauthorized");
    }

    await ctx.db.patch(expenseId, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    });

    return expenseId;
  },
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("budgetExpenses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found or unauthorized");
    }

    await ctx.db.delete(args.expenseId);
    return true;
  },
});
