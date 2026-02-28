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
        statePensionAmount: 11000,  // Default UK state pension
        statePensionAge: 67,
        isRetired: false,
      };
    }

    return {
      statePensionAmount: settings.statePensionAmount,
      statePensionAge: settings.statePensionAge,
      isRetired: settings.isRetired ?? false,
    };
  },
});

export const saveUserSettings = mutation({
  args: {
    userId: v.id("users"),
    statePensionAmount: v.float64(),
    statePensionAge: v.number(),
    isRetired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        statePensionAmount: args.statePensionAmount,
        statePensionAge: args.statePensionAge,
        isRetired: args.isRetired ?? false,
        lastUpdated: new Date().toISOString(),
      });
      return existing._id;
    } else {
      // Create new settings
      return await ctx.db.insert("userSettings", {
        userId: args.userId,
        statePensionAmount: args.statePensionAmount,
        statePensionAge: args.statePensionAge,
        isRetired: args.isRetired ?? false,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});
