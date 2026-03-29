import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateUserPortfolio = mutation({
  args: { 
    id: v.optional(v.id("portfolios")), 
    name: v.string(),
    portfolioType: v.optional(v.union(v.literal("live"), v.literal("manual")))
  },
  handler: async (ctx, args) => {
    
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const portfolioType = args.portfolioType || "live"; // Default to "live" for backward compatibility

    // If no ID provided, create a new portfolio
    if (!args.id) {
      const newId = await ctx.db.insert("portfolios", {
        userId: userId,
        name: args.name,
        portfolioType: portfolioType,
        lastUpdated: new Date().toISOString(),
      });
      return { success: true, portfolioId: newId };
    }

    const portfolio = await ctx.db.get(args.id);

    if (!portfolio) {
      return { error: "Portfolio not found." };
    }

    if (portfolio.userId !== userId) {
      return { error: "Unauthorized." };
    }

    await ctx.db.replace(portfolio._id, {
      name: args.name,
      userId: portfolio.userId,
      portfolioType: portfolio.portfolioType || portfolioType, // Preserve existing type if not updating
      lastUpdated: new Date().toISOString(),
    });
      
    return { success: true, portfolioId: portfolio._id };
  },
});