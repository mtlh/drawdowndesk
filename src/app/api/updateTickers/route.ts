import YahooFinance from "yahoo-finance2";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function GET() {
    
    const holdings = await convex.query(api.portfolio.currentPriceUpdates.updateHoldingWithTicker.getAllHoldings, {});

    await Promise.all( 
        holdings.map(async (ticker) => { 
            //console.log(ticker)
            const q = await yahooFinance.quote(ticker); 
            //console.log(q)
            if (q) {
                await convex.mutation(api.portfolio.currentPriceUpdates.updateHoldingWithTicker.updateHoldingWithTicker, {
                    symbol: q.symbol,
                    currentPrice: q.regularMarketPrice,
                });
            }
        })
    );

    return new Response("Success");
}