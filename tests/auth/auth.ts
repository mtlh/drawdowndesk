import { test as base, Page, BrowserContext } from "@playwright/test";

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";

async function authenticate(page: Page): Promise<boolean> {
  await page.goto("/login", { timeout: 60000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
  
  const currentUrl = page.url();
  if (currentUrl.includes("/holdings")) {
    return true;
  }
  
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  
  try {
    await emailInput.waitFor({ state: "visible", timeout: 30000 });
  } catch {
    return false;
  }
  
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);
  
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  await page.waitForURL("**/holdings", { timeout: 60000 });
  
  return true;
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticate(page);
    
    await use(page);
    
    await context.close();
  },
});

export { expect } from "@playwright/test";