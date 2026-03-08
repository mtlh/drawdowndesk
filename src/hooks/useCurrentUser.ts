import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to get the current authenticated user
 */
export function useCurrentUser(): { _id: Id<"users"> } | null | undefined {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser);
}
