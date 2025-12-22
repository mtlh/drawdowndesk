import { Id } from "../../convex/_generated/dataModel";

export interface Portfolio {
  name: string;                // e.g., "My Portfolio"
  lastUpdated?: string;        // Optional ISO timestamp
}

export interface Holding {
  _id: Id<"holdings"> | undefined;                 // Convex id("holdings")
  portfolioId?: Id<"portfolios"> | undefined;        // Foreign key to portfolio (optional)
  symbol: string;              // e.g., "MSFT"
  name: string;                // e.g., "Microsoft Corporation"
  accountName?: string;        // e.g., "S&S ISA"
  holdingType: string;         // e.g., "Stock", "Bond", "Commodity"
  shares: number;              // e.g., 1000
  avgPrice: number;            // e.g., 120.5
  currentPrice: number;        // e.g., 118.2
  purchaseDate: string;        // e.g., "2022-03-15"
  lastUpdated?: string;        // Optional ISO timestamp
}
 
export interface BuySellEvent {
  portfolioId?: Id<"portfolios"> | undefined;        // Foreign key to portfolio (optional)
  holdingId?: Id<"holdings"> | undefined;          // Foreign key to holding (optional)
  userId: string;              // Authenticated user ID
  buyShares: number;           // Positive = buy, negative = sell
  purchaseDate: string;        // e.g., "2022-03-15"
  pricePerShare: number;       // e.g., 120.5
  notes?: string;              // Optional notes
  lastUpdated?: string;        // Optional ISO timestamp
}

export interface PortfolioWithHoldings {
  holdings: Holding[];
  lastUpdated?: string;
  name: string;
}

type PortfolioData = | PortfolioWithHoldings[] | { error: string } | undefined; 

export function isError( data: PortfolioData ): data is { error: string } { return typeof data === "object" && data !== null && "error" in data; } 

export function isPortfolioArray( data: PortfolioData ): data is PortfolioWithHoldings[] { return Array.isArray(data); }