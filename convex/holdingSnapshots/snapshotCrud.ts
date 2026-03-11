import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getHoldingSnapshots = query({
  args: {
    months: v.optional(v.number()),
    symbol: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const months = args.months || 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    let query = ctx.db
      .query("holdingSnapshots")
      .withIndex("by_userSymbolDate", (q) => 
        q.eq("userId", userId)
      );

    const snapshots = await query.collect();

    // Filter by date and optionally by symbol
    return snapshots.filter(s => 
      s.snapshotDate >= cutoffStr &&
      (!args.symbol || s.symbol === args.symbol)
    );
  },
});

export const createHoldingSnapshot = mutation({
  args: {
    symbol: v.string(),
    price: v.float64(),
    snapshotDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const snapshotDate = args.snapshotDate || new Date().toISOString().split("T")[0];

    // Check if snapshot already exists for this symbol and date
    const existing = await ctx.db
      .query("holdingSnapshots")
      .withIndex("by_userSymbolDate", (q) => 
        q.eq("userId", userId)
          .eq("symbol", args.symbol)
          .eq("snapshotDate", snapshotDate)
      )
      .first();

    if (existing) {
      // Update existing snapshot
      await ctx.db.patch(existing._id, {
        price: args.price,
        lastUpdated: new Date().toISOString(),
      });
      return existing._id;
    } else {
      // Create new snapshot
      const snapshotId = await ctx.db.insert("holdingSnapshots", {
        userId,
        symbol: args.symbol,
        price: args.price,
        snapshotDate,
        lastUpdated: new Date().toISOString(),
      });
      return snapshotId;
    }
  },
});

export const createHoldingSnapshotsBatch = mutation({
  args: {
    snapshots: v.array(v.object({
      symbol: v.string(),
      price: v.float64(),
      snapshotDate: v.optional(v.string()),
    })),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    const userId = args.userId || authUserId;
    if (!userId) throw new Error("User ID required");

    const snapshotDate = new Date().toISOString().split("T")[0];
    const results: string[] = [];

    for (const snap of args.snapshots) {
      const date = snap.snapshotDate || snapshotDate;
      
      // Check if snapshot already exists
      const existing = await ctx.db
        .query("holdingSnapshots")
        .withIndex("by_userSymbolDate", (q) => 
          q.eq("userId", userId)
            .eq("symbol", snap.symbol)
            .eq("snapshotDate", date)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          price: snap.price,
          lastUpdated: new Date().toISOString(),
        });
        results.push(existing._id);
      } else {
        const snapshotId = await ctx.db.insert("holdingSnapshots", {
          userId,
          symbol: snap.symbol,
          price: snap.price,
          snapshotDate: date,
          lastUpdated: new Date().toISOString(),
        });
        results.push(snapshotId);
      }
    }

    return results;
  },
});
