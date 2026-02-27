# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DrawdownDesk is a personal finance and investment portfolio management application for tracking investments, simulating returns, and calculating retirement income. It uses live stock prices via Alpha Vantage API for portfolio tracking includes and UK tax band calculations.

## Common Commands

```bash
npm run dev      # Start development server with Turbopack
npm run start    # Start production server
npm run lint     # Run ESLint + TypeScript type checking
```

**Important Verification Steps:**
- Run `npm run lint` to verify changes compile and have no type errors
- Run `npm run build` - only if told clearly to do so. It modifies the Next.js settings manifest and breaks the local dev server for the user.
- If type checking is needed separately, use `npx tsc --noEmit`
- After modifying convex functions, run `npx convex dev` to regenerate the API types

## Architecture

### Tech Stack
- **Framework:** Next.js 15.4 (App Router with Turbopack)
- **Database & Auth:** Convex (serverless, real-time sync)
- **UI:** React 19, TypeScript, Tailwind CSS 4
- **Components:** Radix UI primitives (shadcn/ui style)
- **Charts:** Recharts

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Portfolio overview dashboard
│   ├── holdings/          # Holdings management pages
│   ├── monte-carlo-simulator/  # Investment simulation
│   ├── cashflow-calculator/    # Retirement income calculator
│   ├── one-off-cgt/      # Capital gains tax calculator
│   ├── api/updateTickers/  # API route for ticker updates
│   └── layout.tsx        # Main layout with sidebar
├── components/
│   ├── ui/               # Reusable Radix-based components
│   └── customTreeMap/    # Treemap visualization component
├── lib/                  # Utility functions and calculations
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions

convex/                   # Backend functions
├── schema.ts            # Database schema
├── portfolio/           # Portfolio CRUD operations
├── calculators/        # Monte Carlo and calculation logic
├── tax/                # UK tax band queries and seeding
└── auth.ts             # Convex authentication
```

### Database Schema (Convex)

Main tables in `convex/schema.ts`:
- `portfolios` - User portfolios (live or manual type)
- `holdings` - Stock/fund holdings with ticker tracking (live portfolios)
- `simpleHoldings` - Manual holdings for pensions/OICS
- `buySellEvents` - Transaction history
- `taxYears`, `taxBands`, `personalAllowances`, `capitalGainsTax` - UK tax configuration
- `historicalReturns` - Historical market data for Monte Carlo simulations
- `users` - Authentication (via @convex-dev/auth)

### Key Patterns

1. **Live vs Manual Portfolios:** Portfolios can be "live" (API-tracked tickers) or "manual" (pensions, OICS with manual value entry)
2. **Ticker Updates:** Live holdings refresh prices via `/api/updateTickers` route using Alpha Vantage API with backup keys
3. **UK Tax Calculations:** Tax bands are seeded into Convex and queried for cashflow/CGT calculations
4. **Monte Carlo:** Uses seeded historical returns to simulate investment projections

### Environment Variables

Required in `.env.local`:
- `CONVEX_DEPLOYMENT` - Convex deployment name
- `NEXT_PUBLIC_CONVEX_URL` - Convex URL
- `ALPHAVANTAGE_API_KEY` - Primary Alpha Vantage API key (for ticker prices)
- `ALPHAVANTAGE_API_KEY_2`, `ALPHAVANTAGE_API_KEY_3` - Backup keys
