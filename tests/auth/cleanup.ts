import { test as base, chromium } from "@playwright/test";

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";

interface CleanupData {
  holdings: string[];
  portfolios: string[];
  goals: string[];
  scenarios: string[];
  accounts: string[];
  financeNotes: string[];
  lifetimeAccumulations: string[];
}

const createdData: CleanupData = {
  holdings: [],
  portfolios: [],
  goals: [],
  scenarios: [],
  accounts: [],
  financeNotes: [],
  lifetimeAccumulations: [],
};

export async function cleanupTestData(page: any) {
  console.log("Running cleanup of test data...");
  
  try {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
    
    const deleteButtons = page.locator('button[aria-label="Delete"], button:has-text("Delete")');
    const count = await deleteButtons.count();
    console.log(`Found ${count} delete buttons`);
    
    for (let i = 0; i < count; i++) {
      try {
        const btn = deleteButtons.nth(i);
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          await page.waitForTimeout(500);
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
          if (await confirmBtn.isVisible({ timeout: 1000 })) {
            await confirmBtn.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (e) {
        console.log("Could not delete item", i);
      }
    }
  } catch (e) {
    console.log("Cleanup error:", e);
  }
}

export const cleanup = base.extend<{ cleanup: () => Promise<void> }>({
  cleanup: async ({}, use) => {
    await use(async () => {
      console.log("Test cleanup triggered");
    });
  },
});

export { expect } from "@playwright/test";