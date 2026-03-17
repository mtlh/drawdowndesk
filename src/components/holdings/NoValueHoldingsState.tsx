import Link from "next/link";

interface NoValueHoldingsStateProps {
  portfolioId: string;
  message?: string;
}

export function NoValueHoldingsState({ portfolioId, message }: NoValueHoldingsStateProps) {
  return (
    <Link
      href={`/holdings/${portfolioId}`}
      className="cursor-pointer hover:opacity-80 transition-opacity"
    >
      <div className="py-8 text-center text-muted-foreground hover:text-foreground">
        {message || "No holdings with value in this portfolio."}
        <div className="mt-4 text-sm font-medium">Click to manage holdings</div>
      </div>
    </Link>
  );
}
