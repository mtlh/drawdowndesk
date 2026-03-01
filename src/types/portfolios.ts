import { Id } from "../../convex/_generated/dataModel";

export interface Portfolio {
  _id: Id<"portfolios">;
  name: string;                // e.g., "My Portfolio"
  portfolioType?: "live" | "manual";  // "live" for API-tracked, "manual" for pensions/OICS
  lastUpdated?: string;        // Optional ISO timestamp
}

export interface Holding {
  _id: Id<"holdings"> | undefined;                 // Convex id("holdings")
  portfolioId?: Id<"portfolios"> | undefined;        // Foreign key to portfolio (optional)
  symbol: string;              // e.g., "MSFT" or "ACWI"
  name: string;                // e.g., "Microsoft Corporation"
  accountName?: string;        // e.g., "S&S ISA"
  holdingType: string;         // e.g., "Stock", "Bond", "Commodity"
  dataType?: string;           // "stock" or "etf" for Twelve Data API
  exchange?: string;           // e.g., "LON", "NASDAQ", "LSE" for Twelve Data API
  currency?: string;           // e.g., "GBP", "USD", "GBp"
  shares: number;              // e.g., 1000
  avgPrice: number;            // e.g., 120.5
  currentPrice: number;        // e.g., 118.2
  purchaseDate: string;        // e.g., "2022-03-15"
  lastUpdated?: string;        // Optional ISO timestamp
}
 
export interface BuySellEvent {
  _id?: Id<"buySellEvents">;
  portfolioId?: Id<"portfolios"> | undefined;        // Foreign key to portfolio (optional)
  holdingId?: Id<"holdings"> | undefined;          // Foreign key to holding (optional)
  userId: string;              // Authenticated user ID
  symbol: string;              // e.g., "MSFT"
  name: string;                // e.g., "Microsoft Corporation"
  currency?: string;           // e.g., "GBP", "USD", "GBp"
  buyShares: number;           // Positive = buy, negative = sell
  purchaseDate: string;        // e.g., "2022-03-15"
  pricePerShare: number;       // e.g., 120.5
  notes?: string;              // Optional notes
  lastUpdated?: string;        // Optional ISO timestamp
}

export interface SimpleHolding {
  _id: Id<"simpleHoldings"> | undefined;
  portfolioId: Id<"portfolios">;
  name: string;                // e.g., "Vanguard Global All Cap"
  value: number;               // Total current value in GBP
  accountName?: string;        // e.g., "S&S ISA", "Pension"
  holdingType?: string;        // e.g., "Fund", "Pension", "Savings"
  notes?: string;              // Optional notes
  lastUpdated?: string;        // Optional ISO timestamp
}

export interface PortfolioWithHoldings {
  _id: Id<"portfolios">;
  userId: Id<"users">;
  holdings: Holding[];
  simpleHoldings?: SimpleHolding[];  // For manual portfolios
  lastUpdated?: string;
  name: string;
  portfolioType?: "live" | "manual";
  _creationTime?: number;
}

export type AccountType = "bank" | "savings" | "pension" | "crypto" | "cash" | "other";

export interface Account {
  _id: Id<"accounts">;
  userId: Id<"users">;
  name: string;
  accountType: AccountType;
  tag?: string;
  value: number;
  portfolioId?: Id<"portfolios">;
  notes?: string;
  lastUpdated?: string;
}

export interface AccountWithPortfolio extends Account {
  portfolioName?: string;
}

type PortfolioData = | PortfolioWithHoldings[] | { error: string } | undefined; 

export function isError( data: PortfolioData ): data is { error: string } { return typeof data === "object" && data !== null && "error" in data; } 

export function isPortfolioArray( data: PortfolioData ): data is PortfolioWithHoldings[] { return Array.isArray(data); }