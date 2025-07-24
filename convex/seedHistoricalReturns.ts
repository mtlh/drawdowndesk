import { mutation } from "../convex/_generated/server";

export const seedTaxInfo = mutation(async ({ db }) => {
  
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
        await db.insert("historicalReturns", {
            assetName: "FTSE Global All Cap",
            assetType: "Stock",
            returnYear: returnData.year,
            returnAmount: returnData.returnAmount,
            lastUpdated: new Date().toISOString(),
        });
    }

  return "Historical returns seeded successfully.";
});
