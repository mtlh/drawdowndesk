import { test as base, Page, Browser, BrowserContext } from "@playwright/test";

const TEST_USER_EMAIL = process.env.JEST_USERNAME || "";
const TEST_USER_PASSWORD = process.env.JEST_PASSWORD || "";

const isCI = process.env.CI === "true";

let sharedBrowser: BrowserContext | null = null;

async function getAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  if (isCI && sharedBrowser) {
    console.log("Reusing shared authenticated browser context");
    return sharedBrowser;
  }
  
  const context = await browser.newContext();
  
  if (isCI) {
    await authenticateInContext(context);
    sharedBrowser = context;
    console.log("Created and stored shared authenticated browser context");
  }
  
  return context;
}

async function authenticateInContext(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await authenticate(page);
  return page;
}

async function authenticate(page: Page): Promise<boolean> {
  console.log("Starting authentication...");
  
  await page.goto("/", { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  
  console.log("Page loaded, URL:", page.url());
  
  const currentUrl = page.url();
  if (currentUrl.includes("/holdings")) {
    console.log("Already authenticated");
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
  
  const flowInput = page.locator('input[name="flow"]');
  await flowInput.fill("signIn");
  
  console.log("Filling credentials, clicking submit...");
  
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  console.log("Waiting for redirect after login...");
  
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {
    console.log("Network idle timeout");
  }
  
  const urlAfterLogin = page.url();
  console.log("URL after login attempt:", urlAfterLogin);
  
  if (urlAfterLogin.includes("/holdings")) {
    return true;
  }
  
  const errorMessage = page.locator('p:has-text("Invalid"), p:has-text("error")').first();
  const hasError = await errorMessage.isVisible().catch(() => false);
  if (hasError) {
    console.log("Login error visible:", await errorMessage.textContent());
  }
  
  const emailError = await page.locator('input[name="email"]:visible').first().isVisible().catch(() => false);
  if (emailError) {
    console.log("Email input still visible - login likely failed");
  }
  
  try {
    await page.waitForURL("**/holdings", { timeout: 30000 });
  } catch {
    const finalUrl = page.url();
    console.log("Auth redirect failed. Final URL:", finalUrl);
    if (finalUrl.includes("/holdings")) {
      return true;
    }
    throw new Error(`Authentication failed. Expected /holdings but got: ${finalUrl}`);
  }
  
  return true;
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    const context = isCI && sharedBrowser 
      ? sharedBrowser 
      : await getAuthenticatedContext(browser);
    
    const page = await context.newPage();
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("[Browser Error]:", msg.text());
        const text = msg.text();
        if (text.includes("404")) {
          console.log("[Browser 404 Details]: Resource failed to load");
        }
      }
    });
    
    page.on("pageerror", (err) => {
      console.log("[Page Error]:", err.message);
    });

    page.on("requestfailed", (request) => {
      console.log("[Request Failed]:", request.url(), request.failure()?.errorText);
    });

    page.on("response", (response) => {
      if (response.status() === 404) {
        console.log("[404 Response]:", response.url());
      }
    });
    
    if (!isCI || !sharedBrowser) {
      await authenticate(page);
    }
    
    await use(page);
    
    if (!isCI) {
      await context.close();
    }
  },
});

export { expect } from "@playwright/test";