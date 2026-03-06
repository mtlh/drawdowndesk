import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const updateSimpleHolding = mutation({
  args: {
    _id: v.optional(v.id("simpleHoldings")),
    portfolioId: v.id("portfolios"),
    name: v.string(),
    value: v.float64(),
    accountName: v.optional(v.string()),
    dataType: v.optional(v.string()),
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

    // Optimization: If _id is provided, fetch directly instead of all and find
    let existingHolding = null;
    if (args._id) {
      existingHolding = await ctx.db.get(args._id);
      // Verify ownership
      if (existingHolding && (existingHolding.userId !== userId || existingHolding.portfolioId !== args.portfolioId)) {
        existingHolding = null;
      }
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
        dataType: args.dataType,
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
        dataType: args.dataType,
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
