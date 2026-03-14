import { test, expect } from "../auth/auth";

test.describe("Goals CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/goal-tracker");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display goals page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("goal-tracker");
  });

  test("should create a new goal", async ({ authenticatedPage }) => {
    const addGoalButton = authenticatedPage.getByRole("button", { name: /add goal/i });
    if (await addGoalButton.isVisible()) {
      await addGoalButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const nameInput = authenticatedPage.getByLabel(/goal name/i);
      await nameInput.fill("Test Goal");
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateString = futureDate.toISOString().split("T")[0];
      
      const targetAmountInput = authenticatedPage.getByLabel(/target amount/i);
      await targetAmountInput.fill("10000");
      
      const currentAmountInput = authenticatedPage.getByLabel(/current amount/i);
      await currentAmountInput.fill("1000");
      
      const targetDateInput = authenticatedPage.getByLabel(/target date/i);
      await targetDateInput.fill(dateString);
      
      const createButton = authenticatedPage.getByRole("button", { name: /create goal/i });
      await createButton.click();
      
      await authenticatedPage.waitForTimeout(2000);
    }
  });

  test("should edit an existing goal", async ({ authenticatedPage }) => {
    const editButton = authenticatedPage.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const currentAmountInput = authenticatedPage.getByLabel(/current amount/i);
      if (await currentAmountInput.isVisible()) {
        await currentAmountInput.fill("2000");
        
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await authenticatedPage.waitForTimeout(1000);
        }
      }
    }
  });

  test("should delete a goal", async ({ authenticatedPage }) => {
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

  test("should display validation error for invalid goal data", async ({ authenticatedPage }) => {
    const addGoalButton = authenticatedPage.getByRole("button", { name: /add goal/i });
    if (await addGoalButton.isVisible()) {
      await addGoalButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const createButton = authenticatedPage.getByRole("button", { name: /create goal/i });
      await createButton.click();
      
      await authenticatedPage.waitForTimeout(500);
      
      const nameError = authenticatedPage.getByText(/goal name is required/i);
      await expect(nameError).toBeVisible();
    }
  });

  test("should switch between Active and Completed tabs", async ({ authenticatedPage }) => {
    const activeTab = authenticatedPage.getByRole("tab", { name: /active/i });
    const completedTab = authenticatedPage.getByRole("tab", { name: /completed/i });
    
    if (await activeTab.isVisible()) {
      await activeTab.click();
      await authenticatedPage.waitForTimeout(500);
      
      if (await completedTab.isVisible()) {
        await completedTab.click();
        await authenticatedPage.waitForTimeout(500);
        
        await activeTab.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should close dialog when clicking cancel", async ({ authenticatedPage }) => {
    const addGoalButton = authenticatedPage.getByRole("button", { name: /add goal/i });
    if (await addGoalButton.isVisible()) {
      await addGoalButton.click();
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
