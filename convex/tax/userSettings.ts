import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const getUserSettings = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Return default values if no settings exist
    if (!settings) {
      return {
        theme: "dark",  // Default to dark mode
        statePensionAmount: 11000,  // Default UK state pension
        statePensionAge: 67,
        isRetired: false,
        defaultGrowthRate: 5,  // Default 5% growth
        defaultInflationRate: 2,  // Default 2% inflation
      };
    }

    return {
      theme: settings.theme ?? "dark",
      statePensionAmount: settings.statePensionAmount,
      statePensionAge: settings.statePensionAge,
      isRetired: settings.isRetired ?? false,
      defaultGrowthRate: settings.defaultGrowthRate ?? 5,
      defaultInflationRate: settings.defaultInflationRate ?? 2,
    };
  },
});

export const saveUserSettings = mutation({
  args: {
    userId: v.id("users"),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    statePensionAmount: v.float64(),
    statePensionAge: v.number(),
    isRetired: v.optional(v.boolean()),
    defaultGrowthRate: v.optional(v.float64()),
    defaultInflationRate: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing settings
      const updateFields: Record<string, unknown> = {
        theme: args.theme ?? "dark",
        statePensionAmount: args.statePensionAmount,
        statePensionAge: args.statePensionAge,
        isRetired: args.isRetired ?? false,
        lastUpdated: new Date().toISOString(),
      };
      if (args.defaultGrowthRate !== undefined) {
        updateFields.defaultGrowthRate = args.defaultGrowthRate;
      }
      if (args.defaultInflationRate !== undefined) {
        updateFields.defaultInflationRate = args.defaultInflationRate;
      }
      await ctx.db.patch(existing._id, updateFields);
      return existing._id;
    } else {
      // Create new settings with defaults
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        theme: args.theme ?? "dark",
        statePensionAmount: args.statePensionAmount,
        statePensionAge: args.statePensionAge,
        isRetired: args.isRetired ?? false,
        defaultGrowthRate: args.defaultGrowthRate ?? 5,
        defaultInflationRate: args.defaultInflationRate ?? 2,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

// Mutation to ensure user settings exist with defaults (call on sign-in)
export const ensureUserSettings = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) {
      // Create default settings on first sign-in
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        theme: "dark",  // Default to dark mode
        statePensionAmount: 11000,
        statePensionAge: 67,
        isRetired: false,
        defaultGrowthRate: 5,
        defaultInflationRate: 2,
        lastUpdated: new Date().toISOString(),
      });
    }

    return existing._id;
  },
});
