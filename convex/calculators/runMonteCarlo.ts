import { query } from "../_generated/server";
import { v } from "convex/values";

export type monteCarloReturn = {
    data: {
        startYear: number;
        totalReturn: string;
        yearlyReturns: number[][];
    }[];
    chartdata: ChartRowDynamic[];
    caseKeys: string[];
    percentitleReturns: [string, number][];
    error?: string;
}

type CaseLabel<N extends string> = `${N}`;
type ChartRowDynamic = {
  year: number;
} & {
  [key in CaseLabel<string>]?: number | null;
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

        // if (lookup) {
        //   row["p25"] = +getPercentile([...lookup], 0.25).toFixed(2);
        //   row["p50"] = +getPercentile([...lookup], 0.50).toFixed(2);
        //   row["p75"] = +getPercentile([...lookup], 0.75).toFixed(2);
        // }
    });

    return row;
    });

    // expected chart data
    // { 
    //   yearperiod: 1, case 1: 100, case 2: 200, case 3: 300, p25: 100, p50: 200, p75: 300,
    //   yearperiod: 2, case 1: 200, case 2: 400, case 3: 600, p25: 200, p50: 400, p75: 600,
    // }

    // calculate the percentiles
    const parsedReturns = returns.map(r => parseFloat(r.totalReturn)).filter(r => !isNaN(r));
    const P25 = +getPercentile(parsedReturns, 0.25).toFixed(2);
    const P50 = +getPercentile(parsedReturns, 0.50).toFixed(2);
    const P75 = +getPercentile(parsedReturns, 0.75).toFixed(2);

    //  console.log(returns);
     return {
        data: returns,
        chartdata: chartData,
        caseKeys: Object.keys(chartData[0]).filter(key => /\d+$/.test(key)),
        percentitleReturns: [["P25", P25], ["P50", P50], ["P75", P75]],
        error: undefined,
     };
  },
});

/**
 * Compute the p-th percentile of a sorted array using linear interpolation.
 * @param values  Array of numbers (will be sorted in place)
 * @param p       Percentile in [0..1] (e.g. 0.5 for 50th)
 */
function getPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);

  const idx = (values.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const weight = idx - lo;

  if (hi === lo) {
    return values[lo];
  }
  return values[lo] + (values[hi] - values[lo]) * weight;
}
