import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";

export const getUserPortfolio = query({
  handler: async (ctx) => {

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { error: "User not found." };
    }

    const portfolios = await ctx.db
        .query("portfolios")
        .withIndex("by_userPorfolio", q => q.eq("userId", userId))
        .collect();

    const portfoliosWithHoldings = await Promise.all(
        portfolios.map(async (p) => {
            const holdings = await ctx.db
            .query("holdings")
            .withIndex("by_portfolio", q =>
                q.eq("userId", userId).eq("portfolioId", p._id)
            )
            .collect();

            return { ...p, holdings };
        })
    );
    return portfoliosWithHoldings;
  },
});