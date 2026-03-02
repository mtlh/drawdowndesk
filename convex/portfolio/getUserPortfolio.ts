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

    // Optimization: Fetch all holdings in a single query, then group by portfolioId
    const allHoldings = await ctx.db
        .query("holdings")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect();

    // Fetch all simpleHoldings in a single query
    const allSimpleHoldings = await ctx.db
        .query("simpleHoldings")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect();

    // Group holdings by portfolioId in memory (O(n) instead of N+1 queries)
    const holdingsByPortfolio = new Map<string, typeof allHoldings>();
    for (const holding of allHoldings) {
        const existing = holdingsByPortfolio.get(holding.portfolioId) || [];
        existing.push(holding);
        holdingsByPortfolio.set(holding.portfolioId, existing);
    }

    // Group simpleHoldings by portfolioId
    const simpleHoldingsByPortfolio = new Map<string, typeof allSimpleHoldings>();
    for (const sh of allSimpleHoldings) {
        const existing = simpleHoldingsByPortfolio.get(sh.portfolioId) || [];
        existing.push(sh);
        simpleHoldingsByPortfolio.set(sh.portfolioId, existing);
    }

    // Combine portfolios with their holdings
    const portfoliosWithHoldings = portfolios.map((p) => {
        const holdings = holdingsByPortfolio.get(p._id) || [];
        const simpleHoldings = simpleHoldingsByPortfolio.get(p._id) || [];

        return {
            ...p,
            holdings,
            simpleHoldings: simpleHoldings.length > 0 ? simpleHoldings : undefined,
            portfolioType: p.portfolioType || "live"
        };
    });

    return portfoliosWithHoldings;
  },
});