import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateSimpleHolding = mutation({
  args: {
    _id: v.optional(v.string()),
    portfolioId: v.id("portfolios"),
    name: v.string(),
    value: v.float64(),
    accountName: v.optional(v.string()),
    holdingType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // Verify portfolio exists and is manual type
    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio) {
      return { error: "Portfolio not found." };
    }
    if (portfolio.userId !== userId) {
      return { error: "Unauthorized." };
    }
    if (portfolio.portfolioType !== "manual") {
      return { error: "This portfolio is not a manual portfolio." };
    }

    // Find existing simple holding
    const existing = await ctx.db
      .query("simpleHoldings")
      .withIndex("by_portfolio", q => q.eq("userId", userId).eq("portfolioId", args.portfolioId))
      .collect();

    let existingHolding;
    if (args._id) {
      existingHolding = existing.find(h => h._id === args._id);
    }

    const now = new Date().toISOString();

    // Insert if missing
    if (!existingHolding) {
      await ctx.db.insert("simpleHoldings", {
        userId,
        portfolioId: args.portfolioId,
        name: args.name,
        value: args.value,
        accountName: args.accountName,
        holdingType: args.holdingType,
        notes: args.notes,
        lastUpdated: now,
      });

      return { created: true };
    }

    // Update if present
    if (existingHolding._id) {
      await ctx.db.replace(existingHolding._id, {
        userId,
        portfolioId: args.portfolioId,
        name: args.name,
        value: args.value,
        accountName: args.accountName,
        holdingType: args.holdingType,
        notes: args.notes,
        lastUpdated: now,
      });
      return { updated: true };
    }

    return { error: "Holding not found." };
  },
});

export const deleteSimpleHolding = mutation({
  args: {
    holdingId: v.id("simpleHoldings"),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const holding = await ctx.db.get(args.holdingId);
    if (!holding) {
      return { error: "Holding not found." };
    }
    if (holding.userId !== userId) {
      return { error: "Unauthorized." };
    }

    await ctx.db.delete(args.holdingId);
    return { success: true };
  },
});
