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
  _id: Id<"holdings">
  lastUpdated?: string
  portfolioId?: Id<"portfolios">
  accountName?: string
  symbol: string
  name: string
  userId: string
  shares: number
  avgPrice: number
  currentPrice: number
  purchaseDate: string
  holdingType: string
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
export function normalizePortfolios(
  data: {
    holdings: Holding[];
    _id: Id<"portfolios">;
    _creationTime: number;
    lastUpdated?: string;
    userId: string;
    name: string;
  }[] | { error: string } | undefined
): Portfolio[] {
  if (!data || "error" in data) return []

  return data.map((p) => ({
    _id: p._id,
    _creationTime: p._creationTime,
    lastUpdated: p.lastUpdated,
    name: p.name,
    userId: p.userId,
    holdings: p.holdings,
  }))
}

export function calculateHoldingMetrics(holding: Holding): CalculatedHolding {
  const marketValue = holding.shares * holding.currentPrice
  const costBasis = holding.shares * holding.avgPrice
  const gainLoss = marketValue - costBasis
  const gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0

  return {
    ...holding,
    marketValue,
    costBasis,
    gainLoss,
    gainLossPercent,
  }
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
export function getAccountAllocationData(portfolios: CalculatedPortfolio[]) {
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
      const type = holding.holdingType ?? "Other"
      const value = holding.marketValue

      allocationMap[type] = (allocationMap[type] ?? 0) + value
    })
  })

  return Object.entries(allocationMap).map(([name, value]) => ({
    name,
    value,
  }))
}
