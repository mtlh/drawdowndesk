import { query, mutation } from "../_generated/server";
import { getAuthUserId, getAuthSessionId } from "@convex-dev/auth/server";

export const getUserAccountInfo = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const currentSessionId = await getAuthSessionId(ctx);

    return {
      accounts: accounts.map((account) => ({
        _id: account._id,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        createdAt: account._creationTime,
      })),
      sessions: sessions.map((session) => ({
        _id: session._id,
        isCurrentSession: session._id === currentSessionId,
        createdAt: session._creationTime,
        expirationTime: session.expirationTime,
      })),
    };
  },
});

export const deleteAccount = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();

    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const user = await ctx.db.get(userId);
    if (user) {
      const userHoldings = await ctx.db
        .query("holdings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const holding of userHoldings) {
        await ctx.db.delete(holding._id);
      }

      const userPortfolios = await ctx.db
        .query("portfolios")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const portfolio of userPortfolios) {
        await ctx.db.delete(portfolio._id);
      }

      const userSimpleHoldings = await ctx.db
        .query("simpleHoldings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const holding of userSimpleHoldings) {
        await ctx.db.delete(holding._id);
      }

      const userBuySellEvents = await ctx.db
        .query("buySellEvents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const event of userBuySellEvents) {
        await ctx.db.delete(event._id);
      }

      const userDividends = await ctx.db
        .query("dividends")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const dividend of userDividends) {
        await ctx.db.delete(dividend._id);
      }

      const userPortfolioSnapshots = await ctx.db
        .query("portfolioSnapshots")
        .withIndex("by_userDate", (q) => q.eq("userId", userId))
        .collect();
      for (const snapshot of userPortfolioSnapshots) {
        await ctx.db.delete(snapshot._id);
      }

      const userHoldingSnapshots = await ctx.db
        .query("holdingSnapshots")
        .withIndex("by_userSymbolDate", (q) => q.eq("userId", userId))
        .collect();
      for (const snapshot of userHoldingSnapshots) {
        await ctx.db.delete(snapshot._id);
      }

      const userNetWorthSnapshots = await ctx.db
        .query("netWorthSnapshots")
        .withIndex("by_userDate", (q) => q.eq("userId", userId))
        .collect();
      for (const snapshot of userNetWorthSnapshots) {
        await ctx.db.delete(snapshot._id);
      }

      const userAccounts = await ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const account of userAccounts) {
        await ctx.db.delete(account._id);
      }

      const userGoals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const goal of userGoals) {
        await ctx.db.delete(goal._id);
      }

      const userLifetimeAccumulations = await ctx.db
        .query("lifetimeAccumulations")
        .withIndex("by_userYear", (q) => q.eq("userId", userId))
        .collect();
      for (const accumulation of userLifetimeAccumulations) {
        await ctx.db.delete(accumulation._id);
      }

      const userContinuousContributions = await ctx.db
        .query("continuousContributions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const contribution of userContinuousContributions) {
        await ctx.db.delete(contribution._id);
      }

      const userFinanceNotes = await ctx.db
        .query("financeNotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const note of userFinanceNotes) {
        await ctx.db.delete(note._id);
      }

      const userScenarios = await ctx.db
        .query("scenarios")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const scenario of userScenarios) {
        await ctx.db.delete(scenario._id);
      }

      const userSettings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const setting of userSettings) {
        await ctx.db.delete(setting._id);
      }

      const userTaxAllowances = await ctx.db
        .query("userTaxAllowances")
        .withIndex("by_userYear", (q) => q.eq("userId", userId))
        .collect();
      for (const allowance of userTaxAllowances) {
        await ctx.db.delete(allowance._id);
      }

      const userTaxBands = await ctx.db
        .query("userTaxBands")
        .withIndex("by_userYear", (q) => q.eq("userId", userId))
        .collect();
      for (const band of userTaxBands) {
        await ctx.db.delete(band._id);
      }

      const userCapitalGainsTax = await ctx.db
        .query("userCapitalGainsTax")
        .withIndex("by_userYear", (q) => q.eq("userId", userId))
        .collect();
      for (const cgt of userCapitalGainsTax) {
        await ctx.db.delete(cgt._id);
      }

      await ctx.db.delete(userId);
    }

    return { success: true };
  },
});

export const invalidateOtherSessions = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentSessionId = await getAuthSessionId(ctx);
    if (!currentSessionId) {
      throw new Error("No active session");
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      if (session._id !== currentSessionId) {
        await ctx.db.delete(session._id);
      }
    }

    return { success: true };
  },
});
