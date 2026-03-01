import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// Yahoo Finance ticker suffix mapping for exchanges
const EXCHANGE_SUFFIXES: Record<string, string> = {
  LSE: ".L",    // London Stock Exchange
  LON: ".L",    // London
  NYSE: "",      // New York Stock Exchange
  NASDAQ: "",    // NASDAQ
  EURONEXT: ".AS", // Euronext (Amsterdam)
  PARIS: ".PA",
  FRANKFURT: ".F",
  TOKYO: ".T",
};

// Convert symbol + exchange to Yahoo Finance format (e.g., "ACWI" + "LSE" → "ACWI.L")
// Also handles legacy format where symbol already has suffix (e.g., "ACWI.LON" → "ACWI.L")
function toYahooSymbol(symbol: string, exchange?: string): string {
  // If symbol already has a suffix (e.g., "ACWI.LON"), convert to Yahoo format
  if (symbol.includes(".")) {
    const parts = symbol.split(".");
    const suffix = parts[parts.length - 1].toUpperCase();
    // Map common suffixes
    if (suffix === "LON") return `${parts.slice(0, -1).join(".")}.L`;
    if (suffix === "L") return symbol; // Already in Yahoo format
    // For other suffixes, just use as-is
    return symbol;
  }

  // Use exchange field if provided
  if (exchange) {
    const suffix = EXCHANGE_SUFFIXES[exchange.toUpperCase()];
    return suffix ? `${symbol}${suffix}` : symbol;
  }

  return symbol;
}

// Yahoo Finance module type
type YahooFinanceInstance = {
  quoteCombine(
    query: string,
    queryOptions?: { fields?: string[] }
  ): Promise<{
    symbol?: string;
    regularMarketPrice?: number;
    currency?: string;
  }>;
};

// Import Yahoo Finance and create instance
let yahooFinance: YahooFinanceInstance | null = null;
async function getYahooFinance(): Promise<YahooFinanceInstance> {
  if (!yahooFinance) {
    const YahooFinance = (await import("yahoo-finance2")).default;
    // Suppress the survey notice
    yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] }) as unknown as YahooFinanceInstance;
  }
  return yahooFinance;
}

interface SymbolWithExchange {
  original: string;
  yahooSymbol: string;
}

async function fetchQuotesBatch(
  symbols: SymbolWithExchange[]
): Promise<Map<string, { price: number; currency: string }>> {
  const yf = await getYahooFinance();


  const prices = new Map<string, { price: number; currency: string }>();

  // quoteCombine automatically batches multiple calls into a single HTTP request
  // Call each symbol - they'll be grouped automatically
  const promises = symbols.map(async (symbol) => {
    try {
      const result = await yf.quoteCombine(symbol.yahooSymbol, {
        fields: ["regularMarketPrice", "currency"],
      });

      if (!result || !result.regularMarketPrice) {
        console.warn(`No data for symbol ${symbol.yahooSymbol}`);
        return { original: symbol.original, price: null, currency: null };
      }

      return {
        original: symbol.original,
        price: result.regularMarketPrice,
        currency: result.currency || "USD",
      };
    } catch (err) {
      console.warn(`Failed to fetch ${symbol.yahooSymbol}:`, err);
      return { original: symbol.original, price: null, currency: null };
    }
  });

  // Wait for all promises to resolve - they batch automatically
  const results = await Promise.all(promises);

  for (const r of results) {
    if (r.price !== null) {
      prices.set(r.original, { price: r.price, currency: r.currency || "USD" });
    }
  }

  return prices;
}

interface HoldingPriceInfo {
  symbol: string;
  exchange?: string;
  currency?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // @ts-expect-error - Convex API type instantiation is excessively deep
  const getAllHoldings = api.portfolio.currentPriceUpdates.updateHoldingWithTicker.getAllHoldings;
  const holdings: HoldingPriceInfo[] = await convex.query(getAllHoldings, {});

  // Filter out any holdings with empty/invalid symbols
  const validHoldings = holdings.filter((h) => h.symbol && h.symbol.trim().length > 0);

  if (validHoldings.length !== holdings.length) {
    console.warn(`Filtered out ${holdings.length - validHoldings.length} holdings with invalid symbols`);
  }

  // Deduplicate symbols to avoid redundant API calls
  const uniqueHoldings = Array.from(
    new Map(validHoldings.map((h) => [h.symbol, h])).values()
  );

  // Convert symbols to Yahoo Finance format
  const symbolsToFetch = uniqueHoldings.map((h) => ({
    original: h.symbol,
    yahooSymbol: toYahooSymbol(h.symbol, h.exchange),
  }));

  // Fetch all quotes in a single batch request
  const prices = await fetchQuotesBatch(symbolsToFetch);

  // Update holdings with prices
  const results: Array<{ symbol: string; price: number; currency: string }> = [];
  for (const holding of uniqueHoldings) {
    const priceData = prices.get(holding.symbol);

    if (!priceData) {
      console.warn(`Skipping ${holding.symbol} - no price data`);
      continue;
    }

    // Always use Yahoo's currency and convert GBX to GBP
    // Yahoo returns "GBX" for pence (GBp), "GBP" for pounds
    let currency = priceData.currency;
    let price = priceData.price;

    // Convert GBX (pence) to GBP (pounds)
    if (currency === "GBX") {
      price = price / 100;
      currency = "GBP";
    }

    results.push({
      symbol: holding.symbol,
      price,
      currency,
    });
  }

  for (const q of results) {
    await convex.mutation(
      api.portfolio.currentPriceUpdates.updateHoldingWithTicker.updateHoldingWithTicker,
      {
        symbol: q.symbol,
        currentPrice: q.price,
        currency: q.currency,
      }
    );
  }

  // After updating prices, calculate total portfolio value and save a snapshot
  try {
    await convex.mutation(
      api.portfolio.portfolioSnapshots.calculateAndSaveSnapshot,
      { userId: userId ? userId as Id<"users"> : undefined }
    );
  } catch (snapshotError) {
    console.error("Failed to save portfolio snapshot:", snapshotError);
  }

  // Also save a net worth snapshot (includes all accounts)
  try {
    const netWorthResult = await convex.mutation(
      api.netWorth.netWorthSnapshots.calculateAndSaveNetWorthSnapshot,
      {}
    );

    if (netWorthResult && !netWorthResult.error) {
      console.debug(`Net worth snapshot saved: £${netWorthResult.netWorth?.toLocaleString()}`);
    }
  } catch (netWorthError) {
    console.error("Failed to save net worth snapshot:", netWorthError);
  }

  return new Response("Success");
}
