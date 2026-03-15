import { test as base, Page, Browser, BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";
const STORAGE_STATE_PATH = path.resolve(__dirname, "..", "playwright", ".auth", "user.json");

const isCI = process.env.CI === "true";

let sharedBrowser: BrowserContext | null = null;

async function getAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  if (isCI && sharedBrowser) {
    return sharedBrowser;
  }
  
  const hasStoredAuth = fs.existsSync(STORAGE_STATE_PATH);
  const context = await browser.newContext({ 
    storageState: hasStoredAuth ? STORAGE_STATE_PATH : undefined 
  });
  
  if (isCI) {
    const page = await context.newPage();
    await authenticate(page);
    sharedBrowser = context;
  }
  
  return context;
}

async function authenticate(page: Page): Promise<boolean> {
  await page.goto("/", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  
  const currentUrl = page.url();
  if (currentUrl.includes("/holdings")) {
    return true;
  }
  
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  
  try {
    await emailInput.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    return false;
  }
  
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  try {
    await page.waitForURL("**/holdings", { timeout: 30000 });
  } catch {
    const finalUrl = page.url();
    if (!finalUrl.includes("/holdings")) {
      throw new Error(`Authentication failed. Expected /holdings but got: ${finalUrl}`);
    }
  }
  
  return true;
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const isReusingContext = isCI && sharedBrowser;
    
    const context = isReusingContext 
      ? sharedBrowser!
      : await getAuthenticatedContext(browser);
    
    const page = await context.newPage();
    
    if (!isReusingContext) {
      await authenticate(page);
    }
    
    await use(page);
    
    if (!isCI) {
      await context.close();
    }
  },
});

export { expect } from "@playwright/test";