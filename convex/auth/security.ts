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
