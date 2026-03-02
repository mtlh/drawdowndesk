# DrawdownDesk

A personal finance and investment portfolio management application for tracking investments, simulating returns, and calculating retirement income.

## Features

- **Portfolio Overview** - Dashboard showing total portfolio value, 12-month performance charts, asset allocation breakdown, and holdings treemap visualization
- **Holdings Management** - Create and manage investment portfolios with support for:
  - Live portfolios with API-tracked ticker prices
  - Manual portfolios for pensions, OICS, and other manually-tracked accounts
- **Monte Carlo Simulator** - Project investment returns using historical market data simulations
- **Cashflow Calculator** - Retirement income and pension drawdown calculator with UK tax band integration
- **Capital Gains Tax Calculator** - One-off CGT calculations for withdrawals and disposals

## Tech Stack

- **Framework:** Next.js 15.4 (App Router with Turbopack)
- **UI:** React 19, TypeScript, Tailwind CSS
- **Components:** Radix UI primitives (shadcn/ui style)
- **Database & Auth:** Convex (serverless, real-time sync)
- **Charts:** Recharts
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account (for database and authentication)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up your environment variables in `.env.local`:

```
CONVEX_DEPLOYMENT=your_deployment_name
NEXT_PUBLIC_CONVEX_URL=your_convex_url
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Portfolio overview dashboard
    holdings/             # Portfolio and holdings management
    monte-carlo-simulator/ # Investment simulation tool
    cashflow-calculator/  # Retirement income calculator
    one-off-cgt/          # Capital gains tax calculator
  components/
    ui/                   # Reusable UI components (Radix-based)
    customTreeMap/        # Custom treemap visualization
  lib/                    # Utility functions and calculations
  hooks/                  # Custom React hooks
  types/                  # TypeScript type definitions

convex/
  schema.ts               # Database schema
  portfolio/              # Portfolio CRUD operations
  calculators/            # Monte Carlo and calculation logic
  tax/                    # Tax band queries and seeding
```

## Database Schema

The application uses Convex with the following main tables:

- **portfolios** - User portfolios (live or manual type)
- **holdings** - Individual stock/fund holdings with ticker tracking
- **simpleHoldings** - Manual holdings for pensions/OICS
- **buySellEvents** - Transaction history
- **taxYears**, **taxBands**, **personalAllowances**, **capitalGainsTax** - UK tax configuration
- **historicalReturns** - Historical market data for simulations

## Desktop App (Electron)

The app can also be run as a desktop application using Electron. This wraps the web app in a Chromium webview.

### Running Electron

```bash
# Development - runs Electron with local dev server
npm run electron:dev

# Build production Electron app
npm run electron:build

# Run Electron against a running dev server
npm run electron:start
```

### Building for Release

1. Run `npm run electron:build` - creates `release/DrawdownDesk-win32-x64/`
2. Create tar.gz:
   ```bash
   cd release
   tar -cvf - DrawdownDesk-win32-x64 | gzip -9 > DrawdownDesk-win32-x64.tar.gz
   ```
3. Upload to GitHub releases

### Version Management

Update version in `src/lib/app-config.ts` before releasing:
```typescript
export const APP_VERSION = 'v0.1.0';
export const GITHUB_REPO = 'mtlh/drawdowndesk';
export const DOWNLOAD_FILENAME = 'DrawdownDesk-win32-x64.tar.gz';
```

The download URL is auto-generated from these values and shown in Settings > Appearance.

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run electron:dev` - Run Electron with local dev server
- `npm run electron:build` - Build Electron desktop app

## License

Private project.