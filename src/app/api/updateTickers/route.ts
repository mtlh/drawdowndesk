import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// AlphaVantage API keys configuration - rotate between keys to avoid rate limits
const ALPHAVANTAGE_KEYS = [
  process.env.ALPHAVANTAGE_API_KEY_1 || "",
  process.env.ALPHAVANTAGE_API_KEY_2 || "",
  process.env.ALPHAVANTAGE_API_KEY_3 || "",
  process.env.ALPHAVANTAGE_API_KEY_4 || "",
].filter(Boolean);

let currentKeyIndex = 0;

function getNextKey(): string {
  if (ALPHAVANTAGE_KEYS.length === 0) {
    throw new Error("No AlphaVantage API keys configured");
  }
  const key = ALPHAVANTAGE_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % ALPHAVANTAGE_KEYS.length;
  return key;
}

function removeCurrentKey(): void {
  if (ALPHAVANTAGE_KEYS.length === 0) return;
  
  // Remove the key that was just used (one position back)
  const indexToRemove = currentKeyIndex === 0 ? ALPHAVANTAGE_KEYS.length - 1 : currentKeyIndex - 1;
  const removedKey = ALPHAVANTAGE_KEYS.splice(indexToRemove, 1)[0];
  console.log(`Removed rate-limited API key: ${removedKey}`);
  
  // Adjust currentKeyIndex if needed
  if (currentKeyIndex > indexToRemove) {
    currentKeyIndex--;
  }
  currentKeyIndex = currentKeyIndex % Math.max(1, ALPHAVANTAGE_KEYS.length);
}

interface AlphaVantageQuote {
  symbol: string;
  price: number;
}

async function fetchQuoteWithRetry(
  symbol: string,
  retries = ALPHAVANTAGE_KEYS.length
): Promise<AlphaVantageQuote> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const apiKey = getNextKey();

      // add 250ms delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 250));

      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data["Error Message"]) {
        const errorMsg = `API Error: ${data["Error Message"]}`;
        console.warn(
          `[Retry ${attempt}/${retries}] ${errorMsg}\nURL: ${url}\n`,
        );
        throw new Error(errorMsg);
      }

      // Check for rate limit or info messages
      if (data["Note"] || data["Information"]) {
        const msg = data["Note"] || data["Information"];
        const errorMsg = `Rate limit/Info: ${msg}`;
        console.warn(
          `[Retry ${attempt}/${retries}] ${errorMsg}\nURL: ${url}\n`
        );
        // Remove this key from the pool as it's rate limited
        removeCurrentKey();
        throw new Error(errorMsg);
      }

      const quote = data["Global Quote"];
      if (!quote || !quote["05. price"]) {
        const errorMsg = `No price data found for symbol ${symbol}`;
        console.warn(
          `[Attempt ${attempt}/${retries}] ${errorMsg}\nURL: ${url}\n`,
        );
        throw new Error(errorMsg);
      }

      return {
        symbol: quote["01. symbol"] || symbol,
        price: parseFloat(quote["05. price"]),
      };
    } catch (error) {
      if (attempt === retries) {
        console.error(`Failed to fetch quote for ${symbol} after ${retries} retries`);
        throw error;
      }
      // Wait before retrying with different key
      console.log(`Retrying ${symbol} (attempt ${attempt + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Failed to fetch quote for ${symbol} after retries`);
}

export async function GET() {
  const holdings = await convex.query(
    api.portfolio.currentPriceUpdates.updateHoldingWithTicker.getAllHoldings,
    {}
  );

  // Deduplicate symbols to avoid redundant API calls
  const uniqueHoldings = Array.from(
    new Map(holdings.map((h) => [h.symbol, h])).values()
  );

  const results: Array<{ symbol: string; price: number; currency: string }> = [];
  for (const holding of uniqueHoldings) {
    const quote = await fetchQuoteWithRetry(holding.symbol);
    results.push({
      symbol: quote.symbol,
      price: quote.price,
      currency: holding.currency,
    });
  }

  for (const q of results) {
    // Use the user-defined currency to determine if we need to convert
    // If it's GBp (pence), divide by 100 to get GBP
    let price = q.price;
    if (q.currency === "GBp") {
      price = price / 100;
    }

    await convex.mutation(
      api.portfolio.currentPriceUpdates.updateHoldingWithTicker.updateHoldingWithTicker,
      {
        symbol: q.symbol,
        currentPrice: price,
      }
    );
  }

  return new Response("Success");
}
