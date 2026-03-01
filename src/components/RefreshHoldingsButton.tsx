"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { calculatePortfolioSummary, normalizePortfolios } from "@/lib/calculatePortfolioOverview";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function RefreshButton({
  label = "Refresh All Data",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const portfolioData = usePortfolioData();
  const getUser = useCurrentUser();
  const saveSnapshot = useMutation(api.portfolio.portfolioSnapshots.savePortfolioSnapshot);
  const calculateNetWorthSnapshot = useMutation(api.netWorth.netWorthSnapshots.calculateAndSaveNetWorthSnapshot);
  const syncAutoSyncGoals = useMutation(api.goals.goalCrud.syncAllAutoSyncGoals);

  async function handleClick() {
    try {
      setLoading(true);

      // Get user ID for API call
      const userId = getUser?._id;

      // First refresh the prices (pass userId if available)
      const url = userId
        ? `${window.location.origin}/api/updateTickers?userId=${userId}`
        : `${window.location.origin}/api/updateTickers`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to update holdings with latest prices");
      }

      // Then save portfolio snapshot with current total value
      if (portfolioData.success) {
        const totalValue = calculatePortfolioSummary(normalizePortfolios(portfolioData.data)).totalValue;
        await saveSnapshot({ totalValue });
      }

      // Also update net worth snapshot
      await calculateNetWorthSnapshot();

      // Sync all goals with autoSyncPortfolio enabled
      await syncAutoSyncGoals();

      // refresh the page to show updated data
      window.location.reload();

    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <RotateCcw
        className={`h-4 w-4 transition-transform duration-500 ${
          loading ? "animate-spin" : ""
        }`}
      />
      {label}
    </Button>
  );
}
