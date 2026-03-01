import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get the current authenticated user
 */
export function useCurrentUser() {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser);
}
