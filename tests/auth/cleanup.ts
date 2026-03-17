import { test as base, type Page } from "@playwright/test";

export async function cleanupTestData(page: Page) {
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
      } catch {
        console.log("Could not delete item", i);
      }
    }
  } catch {
    console.log("Cleanup error");
  }
}

export const cleanup = base.extend<{ cleanup: () => Promise<void> }>({
  cleanup: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(async () => {
      console.log("Test cleanup triggered");
    });
  },
});

export { expect } from "@playwright/test";
