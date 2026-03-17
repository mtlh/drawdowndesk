import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyHoldingsStateProps {
  portfolioId: string;
}

export function EmptyHoldingsState({ portfolioId }: EmptyHoldingsStateProps) {
  return (
    <div className="py-8 text-center">
      <div className="text-muted-foreground mb-4">No holdings in this portfolio yet.</div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href={`/holdings/${portfolioId}`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Holding
          </Button>
        </Link>
        <Link href={`/holdings/${portfolioId}`}>
          <Button variant="outline" size="sm">
            View Portfolio
          </Button>
        </Link>
      </div>
    </div>
  );
}
