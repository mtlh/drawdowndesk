import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getScenarios = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return scenarios;
  },
});

export const createScenario = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    pensionValue: v.float64(),
    isaValue: v.float64(),
    giaValue: v.float64(),
    growthRate: v.float64(),
    withdrawalRate: v.float64(),
    startAge: v.number(),
    statePension: v.float64(),
    statePensionAge: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenarioId = await ctx.db.insert("scenarios", {
      userId,
      name: args.name,
      description: args.description,
      pensionValue: args.pensionValue,
      isaValue: args.isaValue,
      giaValue: args.giaValue,
      growthRate: args.growthRate,
      withdrawalRate: args.withdrawalRate,
      startAge: args.startAge,
      statePension: args.statePension,
      statePensionAge: args.statePensionAge,
      lastUpdated: new Date().toISOString(),
    });

    return scenarioId;
  },
});

export const updateScenario = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pensionValue: v.optional(v.float64()),
    isaValue: v.optional(v.float64()),
    giaValue: v.optional(v.float64()),
    growthRate: v.optional(v.float64()),
    withdrawalRate: v.optional(v.float64()),
    startAge: v.optional(v.number()),
    statePension: v.optional(v.float64()),
    statePensionAge: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { scenarioId, ...updates } = args;

    const scenario = await ctx.db.get(scenarioId);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found or unauthorized");
    }

    await ctx.db.patch(scenarioId, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    });

    return scenarioId;
  },
});

export const deleteScenario = mutation({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found or unauthorized");
    }

    await ctx.db.delete(args.scenarioId);
    return true;
  },
});
