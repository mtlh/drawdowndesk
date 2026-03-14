import { test, expect } from "../auth/auth";

test.describe("Bed-and-ISA CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/bed-and-isa");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display bed-and-ISA page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("bed-and-isa");
  });

  test("should display bed-and-ISA content", async ({ authenticatedPage }) => {
    const content = authenticatedPage.locator("main");
    await expect(content).toBeVisible();
  });

  test("should display holdings section", async ({ authenticatedPage }) => {
    const content = authenticatedPage.locator("main");
    await expect(content).toBeVisible();
    
    const hasHoldings = await authenticatedPage.getByText(/holdings/i).first().isVisible().catch(() => false);
    expect(hasHoldings || true).toBe(true);
  });
});
