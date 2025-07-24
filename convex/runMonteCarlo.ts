import { query } from "./_generated/server";
import { v } from "convex/values";

export type monteCarloReturn = {
    data: {
        startYear: number;
        totalReturn: string;
        yearlyReturns: number[][];
    }[];
    chartdata: ChartRowDynamic[];
    caseKeys: string[];
    error?: string;
}

type CaseLabel<N extends number> = `${N}-${N}`;
type ChartRowDynamic = {
  year: number;
} & {
  [key in CaseLabel<number>]?: number | null;
};

export const getAssetReturnsforPeriods = query({
  args: {
    assetName: v.string(),     // e.g., "FTSE Global All Cap"
    yearPeriod: v.number(),    // e.g., 5
  },
  handler: async (ctx, args) => {
    // Get the asset document
    const asset = await ctx.db
      .query("historicalReturns")
      .withIndex("by_asset", (q) => q.eq("assetName", args.assetName))
      .collect();
    if (!asset) return { 
        error: "Asset not found."
     };

    // remove the last x years from the array
    const trimmedReturns = asset.slice(args.yearPeriod, asset.length);

    // console.log(trimmedReturns);

     // Calculate the returns from any "yearPeriod" years ago
     const returns = trimmedReturns.map((a) => {
        let returnAmount = a.returnAmount;
        const yearlyReturns = [];
        // console.log("starting year for calc: ", a.returnYear, a.returnAmount);
        // loop through the year period and calculate the return for the total period
        for (let i = 1; i <= args.yearPeriod; i++) {
            // look in the next document if exists and add the return amount
            // console.log("looking for next year for calc: ", a.returnYear + i);
            const next = asset.find((b) => b.returnYear === a.returnYear + i);
            // console.log("found next year for calc: ", next);
            if (next) {
                returnAmount += next.returnAmount;
                yearlyReturns.push([i, returnAmount]);
            }
        }
        return {
            startYear: a.returnYear,
            totalReturn: returnAmount.toFixed(2),
            yearlyReturns: yearlyReturns,
        };
     });

    const yearSet = new Set<number>();
    returns.forEach(fund =>
    fund.yearlyReturns.forEach(([year]) => yearSet.add(year))
    );

    const years = Array.from(yearSet).sort((a, b) => a - b);
    const chartData: ChartRowDynamic[] = years.map(year => {
    const row: ChartRowDynamic = { year };
    returns.forEach((fund) => {
        const lookup = fund.yearlyReturns.find(([y]) => y === year);
        row[`${fund.startYear}-${fund.startYear+args.yearPeriod}`] = lookup ? lookup[1] : 0;
    });
    return row;
    });

    // expected chart data
    // { 
    //   yearperiod: 1, case 1: 100, case 2: 200, case 3: 300, 
    //   yearperiod: 2, case 1: 200, case 2: 400, case 3: 600,
    // }

    //  console.log(returns);
     return {
        data: returns,
        chartdata: chartData,
        caseKeys: Object.keys(chartData[0]).filter(key => /\d+$/.test(key)),
        error: undefined,
     };
  },
});
