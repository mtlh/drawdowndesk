import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get all lifetime accumulation records for the user, ordered by tax year
export const getAccumulations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const accumulations = await ctx.db
      .query("lifetimeAccumulations")
      .withIndex("by_userYear", q => q.eq("userId", userId))
      .collect();

    // Sort by tax year (ascending)
    return accumulations.sort((a, b) => a.taxYear - b.taxYear);
  },
});

// Get the most recent accumulation record for defaults
export const getLatestAccumulation = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const accumulations = await ctx.db
      .query("lifetimeAccumulations")
      .withIndex("by_userYear", q => q.eq("userId", userId))
      .collect();

    if (accumulations.length === 0) {
      return null;
    }

    // Return the most recent (highest tax year)
    return accumulations.reduce((latest, current) =>
      current.taxYear > latest.taxYear ? current : latest
    );
  },
});

// Create a new lifetime accumulation record
export const createAccumulation = mutation({
  args: {
    taxYear: v.number(),
    userAge: v.number(),
    totalValue: v.float64(),
    breakdown: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Check if record for this tax year already exists
    const existing = await ctx.db
      .query("lifetimeAccumulations")
      .withIndex("by_userYear", q => q.eq("userId", userId).eq("taxYear", args.taxYear))
      .first();

    if (existing) {
      return { error: "A record for this tax year already exists. Please update it instead." };
    }

    const accumulationId = await ctx.db.insert("lifetimeAccumulations", {
      userId,
      taxYear: args.taxYear,
      userAge: args.userAge,
      totalValue: args.totalValue,
      breakdown: args.breakdown,
      notes: args.notes,
      lastUpdated: new Date().toISOString(),
    });

    return { accumulationId };
  },
});

// Update an existing lifetime accumulation record
export const updateAccumulation = mutation({
  args: {
    id: v.id("lifetimeAccumulations"),
    taxYear: v.optional(v.number()),
    userAge: v.optional(v.number()),
    totalValue: v.optional(v.float64()),
    breakdown: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const { id, ...updates } = args;

    // Verify ownership before updating
    const accumulation = await ctx.db.get(id);
    if (!accumulation || accumulation.userId !== userId) {
      return { error: "Accumulation record not found or access denied." };
    }

    // If updating tax year, check no other record exists with that year
    if (updates.taxYear && updates.taxYear !== accumulation.taxYear) {
      const existing = await ctx.db
        .query("lifetimeAccumulations")
        .withIndex("by_userYear", q => q.eq("userId", userId).eq("taxYear", updates.taxYear!))
        .first();

      if (existing && existing._id !== id) {
        return { error: "A record for this tax year already exists." };
      }
    }

    await ctx.db.patch(id, { ...updates, lastUpdated: new Date().toISOString() });

    return { success: true };
  },
});

// Delete a lifetime accumulation record
export const deleteAccumulation = mutation({
  args: {
    id: v.id("lifetimeAccumulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Verify ownership before deleting
    const accumulation = await ctx.db.get(args.id);
    if (!accumulation || accumulation.userId !== userId) {
      return { error: "Accumulation record not found or access denied." };
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Get continuous contributions for the user
export const getContinuousContributions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const contributions = await ctx.db
      .query("continuousContributions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    if (!contributions) {
      return null;
    }

    return contributions;
  },
});

// Save continuous contributions (create or update)
export const saveContinuousContributions = mutation({
  args: {
    contributions: v.string(), // JSON string of { accountName: monthlyAmount, ... }
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Check if contributions already exist
    const existing = await ctx.db
      .query("continuousContributions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        contributions: args.contributions,
        lastUpdated: new Date().toISOString(),
      });
      return { success: true };
    } else {
      // Create new
      const id = await ctx.db.insert("continuousContributions", {
        userId,
        contributions: args.contributions,
        lastUpdated: new Date().toISOString(),
      });
      return { id };
    }
  },
});
