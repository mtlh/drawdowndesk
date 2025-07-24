import { mutation } from "../convex/_generated/server";

export const seedHistoricalReturns = mutation(async ({ db }) => {
  
    // Historical Returns

    // VT
    const vtReturns = [
        { year: 2025, returnAmount: 12.07 },
        { year: 2024, returnAmount: 16.59 },
        { year: 2023, returnAmount: 22.12 },
        { year: 2022, returnAmount: -17.95 },
        { year: 2021, returnAmount: 18.37 },
        { year: 2020, returnAmount: 16.70 },
        { year: 2019, returnAmount: 26.92 },
        { year: 2018, returnAmount: -9.69 },
        { year: 2017, returnAmount: 24.59 },
        { year: 2016, returnAmount: 8.60 },
        { year: 2015, returnAmount: -1.78 },
        { year: 2014, returnAmount: 3.76 },
        { year: 2013, returnAmount: 23.05 },
        { year: 2012, returnAmount: 17.21 },
        { year: 2011, returnAmount: -7.43 },
        { year: 2010, returnAmount: 13.17 },
        { year: 2009, returnAmount: 32.76 },
        { year: 2008, returnAmount: -40.35 },
        { year: 2007, returnAmount: 11.37 },
        { year: 2006, returnAmount: 21.70 },
        { year: 2005, returnAmount: 11.13 },
        { year: 2004, returnAmount: 16.94 },
        { year: 2003, returnAmount: 36.84 },
        { year: 2002, returnAmount: -17.74 },
        { year: 2001, returnAmount: -14.84 },
        { year: 2000, returnAmount: -12.50 },
        { year: 1999, returnAmount: 27.60 },
        { year: 1998, returnAmount: 20.30 },
        { year: 1997, returnAmount: 14.01 },
        { year: 1996, returnAmount: 13.06 },
        { year: 1995, returnAmount: 19.87 },
        { year: 1994, returnAmount: 4.67 },
        { year: 1993, returnAmount: 23.36 },
        { year: 1992, returnAmount: -4.37 },
        { year: 1991, returnAmount: 20.14 },
        { year: 1990, returnAmount: -17.70 },
        { year: 1989, returnAmount: 16.33 },
        { year: 1988, returnAmount: 25.09 },
        { year: 1987, returnAmount: 16.77 },
        { year: 1986, returnAmount: 41.59 },
        { year: 1985, returnAmount: 41.70 },
        { year: 1984, returnAmount: 3.50 },
        { year: 1983, returnAmount: 23.28 },
        { year: 1982, returnAmount: 10.69 },
        { year: 1981, returnAmount: -3.46 },
        { year: 1980, returnAmount: 29.13 },
        { year: 1979, returnAmount: 16.37 },
        { year: 1978, returnAmount: 18.96 },
        { year: 1977, returnAmount: 4.86 },
        { year: 1976, returnAmount: 15.94 },
        { year: 1975, returnAmount: 35.52 },
        { year: 1974, returnAmount: -23.96 },
        { year: 1973, returnAmount: -16.65 },
        { year: 1972, returnAmount: 24.67 },
        { year: 1971, returnAmount: 21.25 },
        { year: 1970, returnAmount: -4.47 },
    ];
    for (const returnData of vtReturns) {
        const existing = await db
        .query("historicalReturns")
        .filter((q) => q.eq(q.field("assetName"), "FTSE Global All Cap"))
        .filter((q) => q.eq(q.field("returnYear"), returnData.year))
        .collect();

        if (existing.length === 0) {
            await db.insert("historicalReturns", {
                assetName: "FTSE Global All Cap",
                assetType: "Stock",
                returnYear: returnData.year,
                returnAmount: returnData.returnAmount,
                lastUpdated: new Date().toISOString(),
            });
        }
    }

    // GOLD 
    const goldReturns: { year: number; percentage: number }[] = [
        { year: 2025, percentage: 29.21 },
        { year: 2024, percentage: 27.16 },
        { year: 2023, percentage: 13.14 },
        { year: 2022, percentage: -0.38 },
        { year: 2021, percentage: -3.76 },
        { year: 2020, percentage: 25.32 },
        { year: 2019, percentage: 18.33 },
        { year: 2018, percentage: -1.55 },
        { year: 2017, percentage: 13.26 },
        { year: 2016, percentage: 8.47 },
        { year: 2015, percentage: -10.31 },
        { year: 2014, percentage: -1.80 },
        { year: 2013, percentage: -28.04 },
        { year: 2012, percentage: 7.02 },
        { year: 2011, percentage: 10.01 },
        { year: 2010, percentage: 29.79 },
        { year: 2009, percentage: 24.53 },
        { year: 2008, percentage: 5.35 },
        { year: 2007, percentage: 30.97 },
        { year: 2006, percentage: 23.04 },
        { year: 2005, percentage: 18.23 },
        { year: 2004, percentage: 4.85 },
        { year: 2003, percentage: 19.89 },
        { year: 2002, percentage: 25.57 },
        { year: 2001, percentage: 0.75 },
        { year: 2000, percentage: -5.44 },
        { year: 1999, percentage: 0.85 },
        { year: 1998, percentage: -0.83 },
        { year: 1997, percentage: -21.41 },
        { year: 1996, percentage: -4.59 },
        { year: 1995, percentage: 0.98 },
        { year: 1994, percentage: -2.17 },
        { year: 1993, percentage: 17.68 },
        { year: 1992, percentage: -5.73 },
        { year: 1991, percentage: -8.56 },
        { year: 1990, percentage: -3.11 },
        { year: 1989, percentage: -2.84 },
        { year: 1988, percentage: -15.26 },
        { year: 1987, percentage: 24.53 },
        { year: 1986, percentage: 18.96 },
        { year: 1985, percentage: 6.0 },
        { year: 1984, percentage: -19.38 },
        { year: 1983, percentage: -16.31 },
        { year: 1982, percentage: 14.94 },
        { year: 1981, percentage: -32.6 },
        { year: 1980, percentage: 15.19 },
        { year: 1979, percentage: 126.55 },
        { year: 1978, percentage: 37.01 },
        { year: 1977, percentage: 22.64 },
        { year: 1976, percentage: -4.1 },
        { year: 1975, percentage: -24.8 },
        { year: 1974, percentage: 66.15 },
        { year: 1973, percentage: 72.96 },
        { year: 1972, percentage: 48.75 },
        { year: 1971, percentage: 16.72 },
        { year: 1970, percentage: 6.19 },
        { year: 1969, percentage: -15.99 },
        { year: 1968, percentage: 11.14 },
    ];
    for (const returnData of goldReturns) {
        const existing = await db
        .query("historicalReturns")
        .filter((q) => q.eq(q.field("assetName"), "Gold"))
        .filter((q) => q.eq(q.field("returnYear"), returnData.year))
        .collect();

        if (existing.length === 0) {
            await db.insert("historicalReturns", {
                assetName: "Gold",
                assetType: "Gold",
                returnYear: returnData.year,
                returnAmount: returnData.percentage,
                lastUpdated: new Date().toISOString(),
            });
        }
    }

  return "Historical returns seeded successfully.";
});
