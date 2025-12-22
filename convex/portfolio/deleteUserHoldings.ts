import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const deleteUserHoldings = mutation({
  args: { holdingId: v.id("holdings") },
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
    return { success: true, message: "Holding deleted." };
  },
});
