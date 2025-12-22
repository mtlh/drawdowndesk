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

    const portfolio = await ctx.db
      .query("portfolios")
      .filter(q => q.eq("userId", userId.toString()))
      .filter(q => q.eq("_id", args.id?.toString()))
      .first();

    if (!portfolio) {
      return { error: "Portfolio not found." };
    }

    await ctx.db.delete(portfolio._id);

    // Delete holdings for portfolio
    const holdings = await ctx.db
      .query("holdings")
      .filter(q => q.eq("userId", userId.toString()))
      .filter(q => q.eq("portfolioId", portfolio._id.toString()))
      .collect();
    
    for (const holding of holdings) {
        await ctx.db.delete(holding._id);
    }

    return { success: true, message: "Portfolio deleted." };
  },
});