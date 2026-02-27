"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { calculatePortfolioSummary, normalizePortfolios } from "@/lib/calculatePortfolioOverview";
import { isError, isPortfolioArray } from "@/types/portfolios";

export function RefreshButton({
  label = "Refresh Current Prices",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const saveSnapshot = useMutation(api.portfolio.portfolioSnapshots.savePortfolioSnapshot);

  async function handleClick() {
    try {
      setLoading(true);

      // First refresh the prices
      const response = await fetch(window.location.origin + "/api/updateTickers");
      if (!response.ok) {
        throw new Error("Failed to update holdings with latest prices");
      }

      // Then save snapshot with current total value
      if (getPortfolioData && !isError(getPortfolioData) && isPortfolioArray(getPortfolioData)) {
        const totalValue = calculatePortfolioSummary(normalizePortfolios(getPortfolioData)).totalValue;
        await saveSnapshot({ totalValue });
      }

      // refresh the page to show updated data
      window.location.reload();

    } catch (error) {
      console.error("Error refreshing prices:", error);
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
