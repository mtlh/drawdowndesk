import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";

const STORAGE_STATE_PATH = path.resolve(__dirname, "..", "playwright", ".auth", "user.json");

const BASE_URL = process.env.DEPLOYED_URL || "http://localhost:3000";

async function authenticate(page: any) {
  await page.goto(BASE_URL + "/", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  
  const currentUrl = page.url();
  if (currentUrl.includes("/holdings")) {
    return;
  }
  
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  
  try {
    await emailInput.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    throw new Error("Email input not visible");
  }
  
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  await page.waitForURL("**/holdings", { timeout: 30000 });
}

async function cleanupPage(page: any, pagePath: string, deleteSelector: string) {
  console.log(`Cleaning up ${pagePath}...`);
  try {
    await page.goto(`${BASE_URL}/${pagePath}`, { timeout: 10000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    const deleteButtons = page.locator(deleteSelector);
    const count = await deleteButtons.count();
    console.log(`  Found ${count} delete buttons`);
    
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
    await cleanupPage(page, "holdings", '[aria-label*="Delete"]:not([aria-label="Delete note"]), button:has-text("Delete")');
    await cleanupPage(page, "goal-tracker", '[aria-label*="Delete"]:not([aria-label="Delete note"]), button:has-text("Delete")');
    await cleanupPage(page, "what-if-scenarios", 'button:has-text("Delete")');
    await cleanupPage(page, "finance-notes", '[title*="Delete"], button:has-text("Delete")');
    await cleanupPage(page, "lifetime-accumulation", '[aria-label*="Delete"]:not([aria-label="Delete note"]), button:has-text("Delete")');
    await cleanupPage(page, "accumulation-forecast", '[aria-label*="Delete"]:not([aria-label="Delete note"]), button:has-text("Delete")');
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