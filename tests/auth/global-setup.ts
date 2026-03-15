import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";

async function cleanupPage(page: any, pagePath: string, deleteSelector: string) {
  console.log(`Cleaning up ${pagePath}...`);
  try {
    await page.goto(`${BASE_URL}/${pagePath}`, { timeout: 10000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    const deleteButtons = page.locator(deleteSelector);
    const count = await deleteButtons.count();
    
    for (let i = 0; i < count; i++) {
      try {
        const btn = deleteButtons.nth(0);
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(500);
          
          const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")').first();
          if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        console.log(`  Could not delete item ${i}`);
      }
    }
    console.log(`  ${count} items deleted`);
  } catch (e) {
    console.log(`  Cleanup skipped: ${e}`);
  }
}

const BASE_URL = process.env.DEPLOYED_URL || "http://localhost:3000";

async function authenticate(page: any) {
  console.log("Authenticating for global setup...");
  
  await page.goto(`${BASE_URL}/login`, { timeout: 60000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
  
  const currentUrl = page.url();
  if (currentUrl.includes("/holdings")) {
    console.log("Already authenticated");
    return;
  }
  
  const bodyText = await page.locator("body").textContent({ timeout: 30000 });
  const hasPortfolio = bodyText?.includes("Portfolio");
  const hasSignInRequired = bodyText?.includes("Sign in required");
  
  if (hasPortfolio && !hasSignInRequired) {
    console.log("Already authenticated");
    return;
  }
  
  const signUpButton = page.getByText("Don't have an account? Sign up");
  try {
    if (await signUpButton.isVisible({ timeout: 3000 })) {
      await signUpButton.click();
    }
  } catch (e) {
    console.log("No sign up button, might already be on sign in form");
  }
  
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  
  try {
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
  } catch {
    console.log("Email input not visible, might be already authenticated");
    return;
  }
  
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);
  
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  await page.waitForURL("**/holdings", { timeout: 60000 });
  
  console.log("Global setup auth successful");
}

export default async function globalSetup() {
  console.log("=== RUNNING GLOBAL SETUP (PRE-TEST CLEANUP) ===");
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await authenticate(page);
    
    console.log("Running cleanup before tests...");
    await cleanupPage(page, "holdings", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "goal-tracker", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "what-if-scenarios", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "finance-notes", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "lifetime-accumulation", 'button[aria-label="Delete"], button:has-text("Delete")');
    console.log("=== GLOBAL SETUP COMPLETE ===");
  } catch (error) {
    console.error("Global setup failed:", error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function globalTeardown() {
  console.log("=== RUNNING GLOBAL TEARDOWN (POST-TEST CLEANUP) ===");
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await authenticate(page);
    
    console.log("Running cleanup after tests...");
    await cleanupPage(page, "holdings", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "goal-tracker", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "what-if-scenarios", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "finance-notes", 'button[aria-label="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "lifetime-accumulation", 'button[aria-label="Delete"], button:has-text("Delete")');
    console.log("=== GLOBAL TEARDOWN COMPLETE ===");
  } catch (error) {
    console.error("Global teardown failed:", error);
  } finally {
    await context.close();
    await browser.close();
  }
}