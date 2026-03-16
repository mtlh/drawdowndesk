import { mutation, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const userId = await getAuthUserId(ctx as never);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;
    if (!email) {
      throw new Error("User email not found");
    }

    const { retrieveAccount, modifyAccountCredentials } = await import("@convex-dev/auth/server");

    try {
      await retrieveAccount(ctx as never, {
        provider: "password",
        account: { id: email, secret: args.currentPassword },
      });
    } catch {
      throw new Error("Current password is incorrect");
    }

    await modifyAccountCredentials(ctx as never, {
      provider: "password",
      account: { id: email, secret: args.newPassword },
    });

    return { success: true };
  },
});
