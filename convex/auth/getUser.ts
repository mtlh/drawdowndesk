import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Return the user ID directly since we don't need other user data
    return { _id: userId };
  },
});
