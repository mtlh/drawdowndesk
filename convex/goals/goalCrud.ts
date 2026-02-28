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
    linkedPortfolioId: v.optional(v.id("portfolios")),
    autoSyncPortfolio: v.optional(v.boolean()),
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
      linkedPortfolioId: args.linkedPortfolioId,
      autoSyncPortfolio: args.autoSyncPortfolio,
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
    linkedPortfolioId: v.optional(v.id("portfolios")),
    autoSyncPortfolio: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { goalId, ...updates } = args;

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // Handle linkedPortfolioId - allow setting to null to unlink
    if (updates.linkedPortfolioId !== undefined) {
      updates.linkedPortfolioId = updates.linkedPortfolioId === null ? undefined : updates.linkedPortfolioId;
    }

    // Check if goal is now completed
    let completedDate: string | undefined = undefined;
    if (updates.currentAmount !== undefined) {
      const targetAmount = updates.targetAmount ?? goal.targetAmount;
      const isNowCompleted = updates.currentAmount >= targetAmount;
      if (isNowCompleted && !goal.isCompleted) {
        updates.isCompleted = true;
        completedDate = new Date().toISOString().split("T")[0];
      } else if (!isNowCompleted && goal.isCompleted) {
        updates.isCompleted = false;
        completedDate = undefined;
      }
    }

    await ctx.db.patch(goalId, {
      ...updates,
      completedDate,
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

export const getGoalsWithPortfolio = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get portfolio values for goals with linked portfolios
    const goalsWithPortfolio = await Promise.all(
      goals.map(async (goal) => {
        if (!goal.linkedPortfolioId) {
          return { ...goal, portfolioValue: null, portfolioName: null };
        }

        const portfolio = await ctx.db.get(goal.linkedPortfolioId);
        if (!portfolio || portfolio.userId !== userId) {
          return { ...goal, portfolioValue: null, portfolioName: null };
        }

        // Calculate portfolio total value
        const holdings = await ctx.db
          .query("holdings")
          .withIndex("by_portfolio", q =>
            q.eq("userId", userId).eq("portfolioId", goal.linkedPortfolioId!)
          )
          .collect();

        const simpleHoldings = await ctx.db
          .query("simpleHoldings")
          .withIndex("by_portfolio", q =>
            q.eq("userId", userId).eq("portfolioId", goal.linkedPortfolioId!)
          )
          .collect();

        // Calculate holdings value with currency conversion
        // GBp (pence) needs to be divided by 100 to get GBP
        // Note: USD/EUR to GBP conversion is not implemented - values remain in original currency
        const holdingsValue = holdings.reduce((sum, h) => {
          const rawValue = (h.shares || 0) * (h.currentPrice || 0);
          // Convert GBp to GBP
          if (h.currency === "GBp") {
            return sum + (rawValue / 100);
          }
          return sum + rawValue;
        }, 0);

        // Simple holdings are already in GBP per schema
        const simpleHoldingsValue = simpleHoldings.reduce((sum, s) => sum + (s.value || 0), 0);
        const portfolioValue = holdingsValue + simpleHoldingsValue;

        return {
          ...goal,
          portfolioValue,
          portfolioName: portfolio.name,
        };
      })
    );

    return goalsWithPortfolio;
  },
});

// Sync all goals with autoSyncPortfolio enabled to their linked portfolio values
export const syncAllAutoSyncGoals = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { syncedCount: 0 };

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter to only goals with autoSyncPortfolio enabled and a linked portfolio
    const autoSyncGoals = goals.filter(
      (goal) => goal.linkedPortfolioId && goal.autoSyncPortfolio
    );

    let syncedCount = 0;

    // Sync each goal
    for (const goal of autoSyncGoals) {
      // Get portfolio value
      const holdings = await ctx.db
        .query("holdings")
        .withIndex("by_portfolio", q =>
          q.eq("userId", userId).eq("portfolioId", goal.linkedPortfolioId!)
        )
        .collect();

      const simpleHoldings = await ctx.db
        .query("simpleHoldings")
        .withIndex("by_portfolio", q =>
          q.eq("userId", userId).eq("portfolioId", goal.linkedPortfolioId!)
        )
        .collect();

      const holdingsValue = holdings.reduce((sum, h) => {
        const rawValue = (h.shares || 0) * (h.currentPrice || 0);
        if (h.currency === "GBp") {
          return sum + (rawValue / 100);
        }
        return sum + rawValue;
      }, 0);

      const simpleHoldingsValue = simpleHoldings.reduce((sum, s) => sum + (s.value || 0), 0);
      const portfolioValue = holdingsValue + simpleHoldingsValue;

      // Check if goal is now completed
      const isNowCompleted = portfolioValue >= goal.targetAmount;
      let completedDate: string | undefined = goal.completedDate;

      if (isNowCompleted && !goal.isCompleted) {
        completedDate = new Date().toISOString().split("T")[0];
      } else if (!isNowCompleted && goal.isCompleted) {
        completedDate = undefined;
      }

      // Update the goal with the new portfolio value
      await ctx.db.patch(goal._id, {
        currentAmount: portfolioValue,
        isCompleted: isNowCompleted,
        completedDate,
        lastUpdated: new Date().toISOString(),
      });

      syncedCount++;
    }

    return { syncedCount };
  },
});
