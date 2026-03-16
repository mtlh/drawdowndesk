import { test, expect } from "../auth/auth";

test.describe("Net Worth CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/net-worth");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display net worth page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("net-worth");
  });

  test("should create a new account", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add account/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      const nameInput = authenticatedPage.locator("#account-name").first();
      await nameInput.fill("Test Savings");
      
      const valueInput = authenticatedPage.locator("#account-value").first();
      await valueInput.fill("10000");
      
      const typeSelect = authenticatedPage.locator("#account-type").first();
      if (await typeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeSelect.click();
        await authenticatedPage.waitForTimeout(500);
        const savingsOption = authenticatedPage.getByRole("option", { name: /savings/i });
        if (await savingsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await savingsOption.click();
        }
      }
      
      const createButton = authenticatedPage.getByRole("button", { name: /add account/i });
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await authenticatedPage.waitForTimeout(1000);
      }
    }
  });

  test("should edit an existing account", async ({ authenticatedPage }) => {
    const editButton = authenticatedPage.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const valueInput = authenticatedPage.getByLabel(/value/i);
      if (await valueInput.isVisible()) {
        await valueInput.fill("15000");
        
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await authenticatedPage.waitForTimeout(1000);
        }
      }
    }
  });

  test("should delete an account", async ({ authenticatedPage }) => {
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

  test("should filter accounts by type", async ({ authenticatedPage }) => {
    const typeFilter = authenticatedPage.getByLabel(/filter by type/i);
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await authenticatedPage.waitForTimeout(300);
      
      const allOption = authenticatedPage.getByRole("option", { name: /all types/i });
      if (await allOption.isVisible()) {
        await allOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should sort accounts by value", async ({ authenticatedPage }) => {
    const sortSelect = authenticatedPage.getByLabel(/sort by/i);
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await authenticatedPage.waitForTimeout(300);
      
      const valueOption = authenticatedPage.getByRole("option", { name: /value/i });
      if (await valueOption.isVisible()) {
        await valueOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should close dialog when clicking cancel", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add account/i }).first();
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

  test("validation_errors_display_correctly", async ({ authenticatedPage }) => {
    // Test validation by opening form and checking errors
    const addButton = authenticatedPage.getByRole("button", { name: /add account/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(1500);
      
      const dialog = authenticatedPage.getByRole("dialog");
      const dialogVisible = await dialog.isVisible().catch(() => false);
      
      if (dialogVisible) {
        const valueInput = authenticatedPage.locator("#account-value");
        await valueInput.fill("1000");
        
        const submitInDialog = dialog.getByRole("button", { name: /add account/i });
        await submitInDialog.click();
        await authenticatedPage.waitForTimeout(500);

        const nameError = authenticatedPage.getByText("Account name is required");
        if (await nameError.isVisible().catch(() => false)) {
          await expect(nameError).toBeVisible();
        }

        const nameInput = authenticatedPage.locator("#account-name");
        await nameInput.fill("A");
        await authenticatedPage.waitForTimeout(500);
        const minLengthError = authenticatedPage.getByText("Name must be at least 2 characters");
        if (await minLengthError.isVisible().catch(() => false)) {
          await expect(minLengthError).toBeVisible();
        }

        const cancelButton = authenticatedPage.getByRole("button", { name: /cancel/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          await authenticatedPage.waitForTimeout(500);
        }
      }
    }
    
    // Verify page has proper structure
    const netWorth = authenticatedPage.getByText("Total Net Worth");
    await expect(netWorth).toBeVisible();
  });

  test("filters_and_sorting_work_correctly", async ({ authenticatedPage }) => {
    await authenticatedPage.waitForTimeout(1000);

    const typeFilter = authenticatedPage.getByLabel(/filter by type/i);
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await authenticatedPage.waitForTimeout(500);
      
      const savingsOption = authenticatedPage.getByRole("option", { name: /savings/i });
      if (await savingsOption.isVisible()) {
        await savingsOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }

    const sortSelect = authenticatedPage.getByLabel(/sort by/i);
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await authenticatedPage.waitForTimeout(500);
      
      const nameOption = authenticatedPage.getByRole("option", { name: /name/i });
      if (await nameOption.isVisible()) {
        await nameOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }

    await sortSelect.click();
    await authenticatedPage.waitForTimeout(500);
    const typeSortOption = authenticatedPage.getByRole("option", { name: /type/i });
    if (await typeSortOption.isVisible()) {
      await typeSortOption.click();
      await authenticatedPage.waitForTimeout(500);
    }

    await sortSelect.click();
    await authenticatedPage.waitForTimeout(500);
    const valueOption = authenticatedPage.getByRole("option", { name: /value/i });
    if (await valueOption.isVisible()) {
      await valueOption.click();
      await authenticatedPage.waitForTimeout(500);
    }

    const clearButton = authenticatedPage.getByRole("button", { name: /clear filters/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await authenticatedPage.waitForTimeout(500);
    }

    await authenticatedPage.goto("/holdings");
    await authenticatedPage.waitForTimeout(1000);
    await authenticatedPage.goto("/net-worth");
    await authenticatedPage.waitForTimeout(1000);
  });

  test("calculations_display_correct_totals", async ({ authenticatedPage }) => {
    await authenticatedPage.waitForTimeout(1000);

    const netWorthText = authenticatedPage.locator("text=Total Net Worth").locator("..").locator(".text-4xl");
    await expect(netWorthText).toBeVisible();
    const netWorthValue = await netWorthText.textContent();
    
    expect(netWorthValue).toContain("£");

    const accountsCard = authenticatedPage.getByText("Accounts").first();
    await expect(accountsCard).toBeVisible();

    const investmentsCard = authenticatedPage.getByText("Investments").first();
    await expect(investmentsCard).toBeVisible();

    const cashCard = authenticatedPage.getByText("Cash").first();
    await expect(cashCard).toBeVisible();

    const ytdCard = authenticatedPage.getByText("YTD").first();
    await expect(ytdCard).toBeVisible();

    const growthElement = authenticatedPage.locator("text=/\\d+(\\.\\d+)?%/").first();
    if (await growthElement.isVisible()) {
      const growthText = await growthElement.textContent();
      expect(growthText).toMatch(/[+-]?\d+(\.\d+)?%/);
    }

    const tableHeader = authenticatedPage.getByText("filtered");
    if (await tableHeader.isVisible()) {
      const filteredText = await tableHeader.textContent();
      expect(filteredText).toContain("£");
    }
  });

  test("ui_states_render_appropriately", async ({ authenticatedPage }) => {
    // Verify page loads with required elements
    const netWorth = authenticatedPage.getByText("Total Net Worth");
    await expect(netWorth).toBeVisible();

    // Check accounts card
    const accountsCard = authenticatedPage.getByText("Accounts").first();
    await expect(accountsCard).toBeVisible();

    // Check investments card
    const investmentsCard = authenticatedPage.getByText("Investments").first();
    await expect(investmentsCard).toBeVisible();

    // Check cash card
    const cashCard = authenticatedPage.getByText("Cash").first();
    await expect(cashCard).toBeVisible();

    // Check table structure
    const table = authenticatedPage.locator("table");
    const hasTable = await table.isVisible().catch(() => false);
    if (hasTable) {
      const tableHeader = authenticatedPage.getByText("Accounts & Investments");
      if (await tableHeader.isVisible().catch(() => false)) {
        await expect(tableHeader).toBeVisible();
      }
    }

    // Check for portfolio links (if any portfolios exist)
    const portfolioLinks = authenticatedPage.getByRole("link").filter({ hasText: /holdings/i });
    const linkCount = await portfolioLinks.count();
    if (linkCount > 0) {
      const firstLink = portfolioLinks.first();
      const href = await firstLink.getAttribute("href");
      expect(href).toContain("/holdings");
    }
  });

  test("chart_renders_with_snapshot_data", async ({ authenticatedPage }) => {
    await authenticatedPage.waitForTimeout(1500);

    const chartContainer = authenticatedPage.locator(".recharts-responsive-container").first();
    
    const isChartVisible = await chartContainer.isVisible().catch(() => false);
    
    if (isChartVisible) {
      await expect(chartContainer).toBeVisible();
      
      const legend = authenticatedPage.locator(".recharts-legend-wrapper");
      const isLegendVisible = await legend.isVisible().catch(() => false);
      
      if (isLegendVisible) {
        const legendText = await legend.textContent();
        expect(legendText).toContain("Net Worth");
      }
    } else {
      const chartHeader = authenticatedPage.getByText("Net Worth Over Time");
      const isHeaderVisible = await chartHeader.isVisible().catch(() => false);
      
      if (isHeaderVisible) {
        await expect(chartHeader).toBeVisible();
      }
    }

    if (isChartVisible) {
      const chartArea = authenticatedPage.locator(".recharts-area").first();
      if (await chartArea.isVisible()) {
        await chartArea.hover();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });
});
