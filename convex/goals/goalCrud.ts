import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getGoals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return goals;
  },
});

export const createGoal = mutation({
  args: {
    name: v.string(),
    targetAmount: v.float64(),
    currentAmount: v.float64(),
    targetDate: v.string(),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goalId = await ctx.db.insert("goals", {
      userId,
      name: args.name,
      targetAmount: args.targetAmount,
      currentAmount: args.currentAmount,
      targetDate: args.targetDate,
      category: args.category || "other",
      notes: args.notes,
      isCompleted: args.currentAmount >= args.targetAmount,
      completedDate: args.currentAmount >= args.targetAmount ? new Date().toISOString().split("T")[0] : undefined,
      lastUpdated: new Date().toISOString(),
    });

    return goalId;
  },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    name: v.optional(v.string()),
    targetAmount: v.optional(v.float64()),
    currentAmount: v.optional(v.float64()),
    targetDate: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { goalId, ...updates } = args;

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // Check if goal is now completed
    if (updates.currentAmount !== undefined) {
      const targetAmount = updates.targetAmount ?? goal.targetAmount;
      const isNowCompleted = updates.currentAmount >= targetAmount;
      if (isNowCompleted && !goal.isCompleted) {
        updates.isCompleted = true;
        updates.completedDate = new Date().toISOString().split("T")[0];
      } else if (!isNowCompleted && goal.isCompleted) {
        updates.isCompleted = false;
        updates.completedDate = undefined;
      }
    }

    await ctx.db.patch(goalId, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    });

    return goalId;
  },
});

export const deleteGoal = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    await ctx.db.delete(args.goalId);
    return true;
  },
});
