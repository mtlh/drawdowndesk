import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const deleteUserPortfolio = mutation({
  args: { id: v.id("portfolios") },
  handler: async (ctx, args) => {

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const portfolio = await ctx.db.get(args.id);

    if (!portfolio) {
      return { error: "Portfolio not found." };
    }

    if (portfolio.userId !== userId) {
      return { error: "Unauthorized." };
    }

    // Delete the portfolio
    await ctx.db.delete(portfolio._id);

    // Delete holdings for portfolio
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_portfolio", (q) => q.eq("userId", userId).eq("portfolioId", portfolio._id))
      .collect();

    for (const holding of holdings) {
      await ctx.db.delete(holding._id);
    }

    // Delete simpleHoldings for manual portfolios
    const simpleHoldings = await ctx.db
      .query("simpleHoldings")
      .withIndex("by_portfolio", (q) => q.eq("userId", userId).eq("portfolioId", portfolio._id))
      .collect();

    for (const simpleHolding of simpleHoldings) {
      await ctx.db.delete(simpleHolding._id);
    }

    return { success: true, message: "Portfolio deleted." };
  },
});