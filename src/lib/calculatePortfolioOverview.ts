import { getPriceInPounds } from "./utils"

export interface CalculatedHolding extends Holding {
  marketValue: number
  costBasis: number
  gainLoss: number
  gainLossPercent: number
}

export interface CalculatedPortfolio {
  id: string
  name: string
  value: number
  change: number
  changePercent: number
  holdings: CalculatedHolding[]
}

export interface PortfolioSummary {
  totalValue: number
  totalChange: number
  totalChangePercent: number
  portfolios: CalculatedPortfolio[]
}

export type Id<T> = string & { __tableName: T }

export interface Holding {
  _id: Id<"holdings"> | undefined
  lastUpdated?: string
  portfolioId?: Id<"portfolios">
  accountName?: string
  symbol: string
  name: string
  userId?: string
  shares: number
  avgPrice: number
  currentPrice: number
  purchaseDate: string
  dataType?: string  // "stock", "bond", "commodity", "crypto" for asset classification
  currency?: string  // e.g., "GBP", "USD", "GBp"
}


export interface Portfolio {
  _id: Id<"portfolios">
  lastUpdated?: string
  name: string
  userId: string
  holdings: Holding[]
}

export type PortfoliosWithHoldings = Portfolio[]

// --- Normalizer for Convex return shape ---
// Accepts PortfolioWithHoldings[] from Convex query and converts to Portfolio[] for calculations
export function normalizePortfolios(
  data: {
    holdings: Holding[];
    simpleHoldings?: Array<{
      name: string;
      value: number;
      accountName?: string;
      dataType?: string;
    }>;
    _id: Id<"portfolios">;
    _creationTime?: number;
    lastUpdated?: string;
    userId: string;
    name: string;
  }[] | { error: string } | undefined
): Portfolio[] {
  if (!data || "error" in data) return []

  return data.map((p) => {
    // Combine regular holdings with simple holdings converted to holding format
    const simpleHoldingsAsHoldings: Holding[] = (p.simpleHoldings || []).map((sh) => {
      const holding: Holding & { _id?: Id<"holdings"> } = {
        _id: undefined,
        portfolioId: p._id,
        symbol: sh.name,
        name: sh.name,
        accountName: sh.accountName,
        dataType: sh.dataType,
        shares: 1,
        avgPrice: sh.value,
        currentPrice: sh.value,
        purchaseDate: new Date().toISOString().split("T")[0],
      }
      return holding as Holding
    })

    return {
      _id: p._id,
      _creationTime: p._creationTime ?? 0,
      lastUpdated: p.lastUpdated,
      name: p.name,
      userId: p.userId,
      holdings: [...p.holdings, ...simpleHoldingsAsHoldings],
    }
  })
}

export function calculateHoldingMetrics(holding: Holding): CalculatedHolding {
  const currency = holding.currency || "GBP";
  const marketValue = getPriceInPounds(holding.shares * holding.currentPrice, currency);
  const costBasis = getPriceInPounds(holding.shares * holding.avgPrice, currency);
  const gainLoss = marketValue - costBasis;
  const gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;

  return {
    ...holding,
    marketValue,
    costBasis,
    gainLoss,
    gainLossPercent,
  };
}

export function calculatePortfolioMetrics(portfolio: Portfolio): CalculatedPortfolio {
  const calculatedHoldings = portfolio.holdings.map(calculateHoldingMetrics)

  const value = calculatedHoldings.reduce((sum, holding) => sum + holding.marketValue, 0)
  const costBasis = calculatedHoldings.reduce((sum, holding) => sum + holding.costBasis, 0)
  const change = value - costBasis
  const changePercent = costBasis !== 0 ? (change / costBasis) * 100 : 0

  return {
    id: portfolio._id,
    name: portfolio.name,
    value,
    change,
    changePercent,
    holdings: calculatedHoldings,
  }
}

export function calculatePortfolioSummary(portfoliosWithHoldings: PortfoliosWithHoldings): PortfolioSummary {
  const portfolios = portfoliosWithHoldings.map(calculatePortfolioMetrics)

  const totalValue = portfolios.reduce((sum, portfolio) => sum + portfolio.value, 0)
  const totalCostBasis = portfolios.reduce(
    (sum, portfolio) => sum + portfolio.holdings.reduce((s, h) => s + h.costBasis, 0),
    0,
  )
  const totalChange = totalValue - totalCostBasis
  const totalChangePercent = totalCostBasis !== 0 ? (totalChange / totalCostBasis) * 100 : 0

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    portfolios,
  }
}

// Generate allocation data for charts
export function getPortfolioAllocationData(portfolios: CalculatedPortfolio[]) {
  return portfolios.map((portfolio) => ({
    name: portfolio.name,
    value: portfolio.value,
  }))
}

// Generate mock historical data based on current portfolio value
export function generateMockPerformanceData(currentValue: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const startValue = currentValue * 0.86 // Start at 86% of current value
  const increment = (currentValue - startValue) / 11

  return months.map((month, index) => ({
    date: month,
    value: Math.round(startValue + increment * index),
  }))
}

export function calculateAssetTypeAllocation(portfolios: CalculatedPortfolio[]) {
  const allocationMap: Record<string, number> = {}

  portfolios.forEach((portfolio) => {
    portfolio.holdings.forEach((holding) => {
      // Use dataType for asset classification, capitalize for display
      let type = holding.dataType || "Other"
      if (type !== "Other") {
        type = type.charAt(0).toUpperCase() + type.slice(1)
      }
      const marketValue = typeof holding.marketValue === "number"
        ? holding.marketValue
        : getPriceInPounds((holding.shares ?? 0) * (holding.currentPrice ?? 0), holding.currency || "GBP")
      allocationMap[type] = (allocationMap[type] ?? 0) + marketValue
    })
  })

  const totalMarketValue = Object.values(allocationMap).reduce((sum, v) => sum + v, 0)
  
  return Object.entries(allocationMap).map(([name, value]) => ({
    name,
    value: totalMarketValue > 0 ? (value / totalMarketValue) * 100 : 0,
  }))
}

// Generate treemap data from all holdings grouped by account
export function generateHoldingsTreemapData(portfolios: CalculatedPortfolio[]) {
  interface TreemapNode {
    name: string
    value?: number
    children?: TreemapNode[]
  }

  // Group all holdings by account - flatten to just account -> individual holdings
  const holdingsByAccount: Record<string, Array<{ symbol: string; marketValue: number; holdingType: string }>> = {}

  portfolios.forEach((portfolio) => {
    portfolio.holdings.forEach((holding) => {
      const accountName = holding.accountName ?? "Unknown"

      if (!holdingsByAccount[accountName]) {
        holdingsByAccount[accountName] = []
      }
      const holdingType = holding.dataType
        ? holding.dataType.charAt(0).toUpperCase() + holding.dataType.slice(1)
        : "Other"
      holdingsByAccount[accountName].push({
        symbol: holding.symbol,
        marketValue: holding.marketValue,
        holdingType,
      })
    })
  })

  // Build treemap structure: Account -> Individual Holdings
  const children: TreemapNode[] = Object.entries(holdingsByAccount).map(([accountName, holdings]) => {
    const accountTotal = holdings.reduce((sum, h) => sum + h.marketValue, 0)

    // Sort holdings by value descending
    const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue)

    return {
      name: accountName,
      value: accountTotal,
      children: sortedHoldings.map((holding) => ({
        name: holding.symbol,
        value: holding.marketValue,
      })),
    }
  })

  return children
}

// Generate allocation data by accounts
export function getAccountAllocationData(portfolios: CalculatedPortfolio[]) {
  const accountMap: Record<string, number> = {}

  portfolios.forEach((portfolio) => {
    portfolio.holdings.forEach((holding) => {
      const accountName = holding.accountName ?? "Unknown"
      accountMap[accountName] = (accountMap[accountName] ?? 0) + holding.marketValue
    })
  })

  return Object.entries(accountMap).map(([name, value]) => ({
    name,
    value,
  }))
}
