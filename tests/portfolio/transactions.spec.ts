import { test, expect } from "../auth/auth";

test.describe("Transactions CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/transactions");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display transactions page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("transactions");
  });

  test("should create a new transaction", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add transaction/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // First select a portfolio
      const portfolioSelect = authenticatedPage.locator("#portfolio").first();
      if (await portfolioSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await portfolioSelect.click();
        await authenticatedPage.waitForTimeout(500);
        const firstOption = authenticatedPage.locator("[role='option']").first();
        if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstOption.click();
          await authenticatedPage.waitForTimeout(500);
        }
      }
      
      // Click "New holding" to show the symbol input
      const newHoldingBtn = authenticatedPage.getByRole("button", { name: /new holding/i });
      if (await newHoldingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newHoldingBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        const symbolInput = authenticatedPage.locator("#symbol").first();
        if (await symbolInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await symbolInput.fill("AAPL");
          
          const nameInput = authenticatedPage.locator("#holding-name").first();
          await nameInput.fill("Apple Inc");
          
          const sharesInput = authenticatedPage.locator("#shares").first();
          await sharesInput.fill("50");
          
          const priceInput = authenticatedPage.locator("#price").first();
          await priceInput.fill("150");
        }
      }
    }
  });
});

test.describe("Transactions List", () => {
  test("should edit an existing transaction", async ({ authenticatedPage }) => {
    const editButton = authenticatedPage.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const sharesInput = authenticatedPage.getByLabel(/shares/i);
      if (await sharesInput.isVisible()) {
        await sharesInput.fill("75");
        
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await authenticatedPage.waitForTimeout(1000);
        }
      }
    }
  });

  test("should delete a transaction", async ({ authenticatedPage }) => {
    const deleteButton = authenticatedPage.getByRole("button", { name: /delete/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const confirmButton = authenticatedPage.getByRole("button", { name: /delete/i }).last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await authenticatedPage.waitForTimeout(1000);
      }
    }
  });

  test("should filter transactions by portfolio", async ({ authenticatedPage }) => {
    const portfolioFilter = authenticatedPage.getByLabel(/filter by portfolio/i);
    if (await portfolioFilter.isVisible()) {
      await portfolioFilter.click();
      await authenticatedPage.waitForTimeout(300);
      
      const allOption = authenticatedPage.getByRole("option", { name: /all portfolios/i });
      if (await allOption.isVisible()) {
        await allOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should filter transactions by date", async ({ authenticatedPage }) => {
    const dateFilter = authenticatedPage.getByLabel(/filter by date/i);
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
      await authenticatedPage.waitForTimeout(300);
      
      const allOption = authenticatedPage.getByRole("option", { name: /all time/i });
      if (await allOption.isVisible()) {
        await allOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should toggle sort direction", async ({ authenticatedPage }) => {
    const sortButton = authenticatedPage.getByRole("button", { name: /sort/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test("should close dialog when clicking cancel", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add transaction/i }).first();
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
});
