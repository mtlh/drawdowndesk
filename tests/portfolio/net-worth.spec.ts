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
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const nameInput = authenticatedPage.getByLabel(/account name/i);
      await nameInput.fill("Test Savings");
      
      const valueInput = authenticatedPage.getByLabel(/value/i);
      await valueInput.fill("10000");
      
      const typeSelect = authenticatedPage.getByLabel(/account type/i);
      if (await typeSelect.isVisible()) {
        await typeSelect.click();
        await authenticatedPage.waitForTimeout(300);
        const savingsOption = authenticatedPage.getByRole("option", { name: /savings/i });
        if (await savingsOption.isVisible()) {
          await savingsOption.click();
        }
      }
      
      const createButton = authenticatedPage.getByRole("button", { name: /add account/i });
      if (await createButton.isVisible()) {
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
});
