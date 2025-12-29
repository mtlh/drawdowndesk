"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function RefreshButton({
  label = "Refresh Current Prices",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      const response = await fetch(window.location.origin + "/api/updateTickers");
      if (!response.ok) {
        throw new Error("Failed to update holdings with latest prices");
      }

      // refresh the page to show updated data
      window.location.reload();

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
