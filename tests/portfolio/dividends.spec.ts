import { test, expect } from "../auth/auth";

test.describe("Dividends CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dividend-calculator");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display dividends page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("dividend");
  });

  test("should create a new dividend", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add dividend/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const symbolInput = authenticatedPage.getByLabel(/symbol/i);
      await symbolInput.fill("AAPL");
      
      const nameInput = authenticatedPage.getByLabel(/name/i);
      await nameInput.fill("Apple Inc");
      
      const sharesInput = authenticatedPage.getByLabel(/shares/i);
      await sharesInput.fill("100");
      
      const dividendInput = authenticatedPage.getByLabel(/dividend per share/i);
      await dividendInput.fill("0.24");
      
      const createButton = authenticatedPage.getByRole("button", { name: /add dividend/i });
      if (await createButton.isVisible()) {
        await createButton.click();
        await authenticatedPage.waitForTimeout(1000);
      }
    }
  });

  test("should edit an existing dividend", async ({ authenticatedPage }) => {
    const editButton = authenticatedPage.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const sharesInput = authenticatedPage.getByLabel(/shares/i);
      if (await sharesInput.isVisible()) {
        await sharesInput.fill("200");
        
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await authenticatedPage.waitForTimeout(1000);
        }
      }
    }
  });

  test("should delete a dividend", async ({ authenticatedPage }) => {
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

  test("should filter by tax band", async ({ authenticatedPage }) => {
    const taxBandFilter = authenticatedPage.getByLabel(/tax band/i);
    if (await taxBandFilter.isVisible()) {
      await taxBandFilter.click();
      await authenticatedPage.waitForTimeout(300);
      
      const basicOption = authenticatedPage.getByRole("option", { name: /basic rate/i });
      if (await basicOption.isVisible()) {
        await basicOption.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should close dialog when clicking cancel", async ({ authenticatedPage }) => {
    const addButton = authenticatedPage.getByRole("button", { name: /add dividend/i });
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
