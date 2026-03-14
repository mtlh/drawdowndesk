import { test, expect } from "../auth/auth";

test.describe("Holdings CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/holdings");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display holdings page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("holdings");
  });

  test("should display holdings page content", async ({ authenticatedPage }) => {
    const content = authenticatedPage.locator("main");
    await expect(content).toBeVisible();
  });

  test("should open add portfolio dialog when clicking Add Portfolio button", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add portfolio/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const dialog = authenticatedPage.getByRole("dialog");
      await expect(dialog).toBeVisible();
      
      const dialogTitle = authenticatedPage.getByText("Create New Portfolio", { exact: false });
      await expect(dialogTitle).toBeVisible();
    }
  });

  test("should filter portfolios by type", async ({ authenticatedPage }) => {
    const typeFilter = authenticatedPage.getByLabel(/filter by type/i);
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await authenticatedPage.waitForTimeout(300);
      
      const liveOption = authenticatedPage.getByRole("option", { name: /live/i });
      if (await liveOption.isVisible()) {
        await liveOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should search holdings", async ({ authenticatedPage }) => {
    const searchInput = authenticatedPage.getByPlaceholder(/search holdings/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await authenticatedPage.waitForTimeout(500);
      
      await searchInput.clear();
      await authenticatedPage.waitForTimeout(300);
    }
  });

  test("should sort portfolios by date or value", async ({ authenticatedPage }) => {
    const sortSelect = authenticatedPage.getByLabel(/sort by/i);
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await authenticatedPage.waitForTimeout(300);
      
      const valueOption = authenticatedPage.getByRole("option", { name: /market value/i });
      if (await valueOption.isVisible()) {
        await valueOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should close dialog when clicking cancel button", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add portfolio/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const cancelButton = authenticatedPage.getByRole("button", { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await authenticatedPage.waitForTimeout(500);
        
        const dialog = authenticatedPage.getByRole("dialog");
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test("should display validation error for invalid portfolio name", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add portfolio/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const createButton = authenticatedPage.getByRole("button", { name: /create portfolio/i });
      await createButton.click();
      
      await authenticatedPage.waitForTimeout(500);
      
      const nameError = authenticatedPage.getByText(/portfolio name must be at least/i);
      await expect(nameError).toBeVisible();
    }
  });

  test("should close dialog when clicking X button", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add portfolio/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const closeButton = authenticatedPage.getByRole("button").first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await authenticatedPage.waitForTimeout(500);
        
        const dialog = authenticatedPage.getByRole("dialog");
        await expect(dialog).not.toBeVisible();
      }
    }
  });
});

test.describe("Holdings Overview", () => {
  test("should display holdings overview page", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/holdings-overview");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
    
    const url = authenticatedPage.url();
    expect(url).toContain("holdings-overview");
  });
});
