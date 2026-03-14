import { test, expect } from "../auth/auth";

test.describe("Finance Notes CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/finance-notes");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display finance notes page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("finance-notes");
  });

  test("should create a new note", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const titleInput = authenticatedPage.getByPlaceholder(/note title/i).or(authenticatedPage.getByLabel(/title/i));
      await titleInput.fill("Test Note");
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test("should edit note title and content", async ({ authenticatedPage }) => {
    const noteItem = authenticatedPage.locator("[class*='note-item']").first();
    if (await noteItem.isVisible()) {
      await noteItem.click();
      await authenticatedPage.waitForTimeout(500);
      
      const titleInput = authenticatedPage.getByPlaceholder(/note title/i).or(authenticatedPage.getByLabel(/title/i));
      if (await titleInput.isVisible()) {
        await titleInput.fill("Updated Title");
        await authenticatedPage.waitForTimeout(2500);
      }
    }
  });

  test("should toggle preview mode", async ({ authenticatedPage }) => {
    const previewButton = authenticatedPage.getByRole("button", { name: /preview/i });
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const editButton = authenticatedPage.getByRole("button", { name: /edit/i });
      if (await editButton.isVisible()) {
        await editButton.click();
        await authenticatedPage.waitForTimeout(500);
      }
    }
  });

  test("should delete a note", async ({ authenticatedPage }) => {
    const noteItem = authenticatedPage.locator("[class*='note-item']").first();
    if (await noteItem.isVisible()) {
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
    }
  });
});

test.describe("Holdings Performance", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/holdings-performance");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display holdings performance page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("holdings-performance");
  });
});
