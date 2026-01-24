import YahooFinance from "yahoo-finance2";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  queue: {
    concurrency: 1,
  },
  quoteCombine: {
    maxSymbolsPerRequest: 50,
    debounceTime: 1000,
  },
});

const fields = ["regularMarketPrice", "currency", "symbol"];

export async function GET() {
    const holdings = await convex.query(
        api.portfolio.currentPriceUpdates.updateHoldingWithTicker.getAllHoldings,
        {}
    );

    const promises = holdings.map(symbol => 
        yahooFinance.quoteCombine(symbol, { fields })
    ); 

    const results = await Promise.all(promises);

    for (const q of results) {
        if (q.currency === "GBp") {
            q.regularMarketPrice = q.regularMarketPrice / 100;
        }

        await convex.mutation(
            api.portfolio.currentPriceUpdates.updateHoldingWithTicker.updateHoldingWithTicker,
            {
                symbol: q.symbol,
                currentPrice: q.regularMarketPrice,
            }
        );
    }

    return new Response("Success");
}
