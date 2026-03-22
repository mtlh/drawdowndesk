import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

const isLocal = !process.env.CI;
if (isLocal) dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: !isLocal,
  workers: isLocal ? 4 : 1,
  forbidOnly: !!process.env.CI,
  retries: isLocal ? 0 : 2,
  timeout: isLocal ? 30000 : 60000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: isLocal ? "http://localhost:3000" : (process.env.DEPLOYED_URL || "https://drawdowndesk.vercel.app"),
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(!isLocal ? {
    globalSetup: "./tests/auth/global-setup.ts",
    globalTeardown: "./tests/auth/global-setup.ts",
  } : {}),
});

/*
Test Coverage by File (each file runs in its own worker):
========================================================

tests/portfolio/
  - holdings.spec.ts           # Holdings + Holdings Overview + Portfolio CRUD
  - net-worth.spec.ts         # Net Worth
  - transactions.spec.ts       # Transactions
  - dividends.spec.ts          # Dividends
  - goals.spec.ts            # Goals + CRUD
  - planning-notes.spec.ts    # Planning Notes, Holdings Performance
  - budget.spec.ts            # Budget Page

tests/calculators/
  - cashflow.spec.ts         # Cashflow Forecast
  - monte-carlo.spec.ts      # Monte Carlo Simulator
  - coast-fi.spec.ts         # Coast FI (Lifetime Accumulation)
  - what-if.spec.ts         # What-If Scenarios + CRUD
  - accumulation.spec.ts    # Accumulation Forecast

tests/tax-planning/
  - tax-loss-harvesting.spec.ts  # Tax-Loss Harvesting
  - one-off-cgt.spec.ts         # One-Off CGT
  - bed-and-isa.spec.ts        # Bed-and-ISA

tests/settings/
  - settings.spec.ts          # Settings

tests/auth/
  - authenticated.spec.ts     # Auth verification
*/