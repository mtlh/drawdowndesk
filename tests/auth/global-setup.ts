import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";
const STORAGE_STATE_PATH = path.resolve(__dirname, "..", "playwright", ".auth", "user.json");

const BASE_URL = process.env.DEPLOYED_URL || "http://localhost:3000";
console.log("Using BASE_URL:", BASE_URL);

async function authenticate(page: any) {
  await page.goto(BASE_URL + "/", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  
  const currentUrl = page.url();
  console.log("Current URL after goto:", currentUrl);
  if (currentUrl.includes("/holdings")) {
    return;
  }
  
  // Try Google sign-in first (primary method)
  const googleButton = page.locator('button:has-text("Continue with Google"), button:has(svg)').first();
  
  if (await googleButton.isVisible().catch(() => false)) {
    console.log("Using Google sign-in...");
    await googleButton.click();
    try {
      await page.waitForURL("**/holdings", { timeout: 30000 });
      return;
    } catch {
      // Google auth might redirect elsewhere, check current URL
      const afterClickUrl = page.url();
      if (afterClickUrl.includes("holdings")) {
        return;
      }
      console.log("Google redirect URL:", afterClickUrl);
    }
  }
  
  // Fallback to email/password
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  
  try {
    await emailInput.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    throw new Error("Could not find sign-in method");
  }
  
  console.log("Using email/password sign-in...");
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  
  const finalUrl = page.url();
  
  if (!finalUrl.includes("/holdings")) {
    throw new Error(`Authentication failed. Expected /holdings but got: ${finalUrl}`);
  }
}

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

export default async function globalSetup() {
  console.log("=== RUNNING GLOBAL SETUP (PRE-TEST CLEANUP) ===");
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await authenticate(page);
    
    const authDir = path.dirname(STORAGE_STATE_PATH);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log("Saved auth state to:", STORAGE_STATE_PATH);
    
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
  
  let browser;
  let context;
  let page;
  
  const hasStoredAuth = fs.existsSync(STORAGE_STATE_PATH);
  if (hasStoredAuth) {
    browser = await chromium.launch();
    context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
  } else {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
    await authenticate(page);
  }
  
  try {
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