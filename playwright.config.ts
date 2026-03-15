import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.DEPLOYED_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./tests/auth/global-setup.ts",
  globalTeardown: "./tests/auth/global-setup.ts",
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