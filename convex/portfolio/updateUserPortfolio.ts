import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateUserPortfolio = mutation({
  args: { id: v.optional(v.id("portfolios")), name: v.string() },
  handler: async (ctx, args) => {
    
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    // If no ID provided, create a new portfolio
    if (!args.id) {
      const newId = await ctx.db.insert("portfolios", {
        userId: userId,
        name: args.name,
        lastUpdated: new Date().toISOString(),
      });
      return { success: true, portfolioId: newId };
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .filter(q => q.eq("userId", userId.toString()))
      .filter(q => q.eq("_id", args.id?.toString()))
      .first();

    if (!portfolio) {
        const newId = await ctx.db.insert("portfolios", {
          userId: userId,
          name: args.name,
          lastUpdated: new Date().toISOString(),
        });
        return { success: true, portfolioId: newId };
    } else { 
        await ctx.db.replace(portfolio._id, {
            name: args.name,
            userId: portfolio.userId,
            lastUpdated: new Date().toISOString(),
        });
        return { success: true, portfolioId: portfolio._id };
    }
  },
});