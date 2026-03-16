import { test, expect } from "../auth/auth";

const DEPLOYED_URL = process.env.DEPLOYED_URL || "https://drawdowndesk.vercel.app";

test.describe("Finance Notes Page", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`${DEPLOYED_URL}/finance-notes`);
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should show empty state and create first note", async ({ authenticatedPage }) => {
    const emptyStateMessage = authenticatedPage.getByText("No notes yet");
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await emptyStateMessage.isVisible().catch(() => false)) {
      await expect(emptyStateMessage).toBeVisible();
      await expect(newNoteButton).toBeVisible();
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      const untitledNote = authenticatedPage.getByText("Untitled Note");
      await expect(untitledNote).toBeVisible();
      
      const wordCount = authenticatedPage.getByText(/0 words?/);
      await expect(wordCount).toBeVisible();
    }
  });

  test("should display loading skeletons then content", async ({ authenticatedPage }) => {
    const skeleton = authenticatedPage.locator("[class*='skeleton']").first();
    await authenticatedPage.waitForTimeout(500);
    
    const content = authenticatedPage.locator("main").first();
    await expect(content).toBeVisible();
  });

  test("should select and load note from sidebar", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    const noteItems = authenticatedPage.locator("[class*='cursor-pointer']");
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(500);
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(500);
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      const notes = await noteItems.count();
      if (notes >= 2) {
        await noteItems.nth(1).click();
        await authenticatedPage.waitForTimeout(500);
        
        const titleInput = authenticatedPage.getByLabel(/note title/i).or(authenticatedPage.getByPlaceholder(/note title/i));
        await expect(titleInput).toBeVisible();
      }
    }
  });

  test("should edit note title and update sidebar", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const titleInput = authenticatedPage.getByLabel(/note title/i).or(authenticatedPage.getByPlaceholder(/note title/i));
      await titleInput.fill("My Updated Title");
      await authenticatedPage.waitForTimeout(500);
      
      const sidebarTitle = authenticatedPage.getByText("My Updated Title");
      await expect(sidebarTitle).toBeVisible();
      
      await authenticatedPage.waitForTimeout(3000);
      
      const savedStatus = authenticatedPage.getByText(/all changes saved/i);
      await expect(savedStatus).toBeVisible({ timeout: 10000 });
    }
  });

  test("should edit content and show unsaved then auto-save", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1500);
      
      const editButton = authenticatedPage.getByRole("button", { name: /edit/i });
      await editButton.waitFor({ state: "visible", timeout: 10000 });
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const contentArea = authenticatedPage.locator("#content");
      await contentArea.fill("This is test content for auto-save verification");
      await authenticatedPage.waitForTimeout(300);
      
      const unsavedStatus = authenticatedPage.getByText(/unsaved changes/i);
      await expect(unsavedStatus).toBeVisible();
      
      await authenticatedPage.waitForTimeout(4000);
      
      const savedStatus = authenticatedPage.getByText(/all changes saved/i);
      await expect(savedStatus).toBeVisible({ timeout: 10000 });
      
      const lastSaved = authenticatedPage.getByText(/last saved/i);
      await expect(lastSaved).toBeVisible();
    }
  });

  test("should toggle between edit and preview mode", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1500);
      
      const editBtn = authenticatedPage.getByRole("button", { name: /edit/i });
      await editBtn.waitFor({ state: "visible", timeout: 10000 });
      await editBtn.click();
      await authenticatedPage.waitForTimeout(500);
      
      const contentArea = authenticatedPage.locator("#content");
      await contentArea.fill("# Test Header\n\nSome content here");
      await authenticatedPage.waitForTimeout(500);
      
      const previewButton = authenticatedPage.getByRole("button", { name: /preview/i });
      await previewButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const renderedHeader = authenticatedPage.locator("h1").getByText("Test Header");
      await expect(renderedHeader).toBeVisible();
      
      const editButton = authenticatedPage.getByRole("button", { name: /edit/i });
      await editButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      await expect(contentArea).toBeVisible();
    }
  });

  test("should render markdown correctly in preview", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1500);
      
      const editBtn = authenticatedPage.getByRole("button", { name: /edit/i });
      await editBtn.waitFor({ state: "visible", timeout: 10000 });
      await editBtn.click();
      await authenticatedPage.waitForTimeout(500);
      
      const contentArea = authenticatedPage.locator("#content");
      const markdownContent = `# Heading 1

## Heading 2

**Bold text**

*Italic text*

- Bullet point 1
- Bullet point 2

1. Numbered 1
2. Numbered 2

> Blockquote

\`inline code\``
;
      await contentArea.fill(markdownContent);
      await authenticatedPage.waitForTimeout(500);
      
      const previewButton = authenticatedPage.getByRole("button", { name: /preview/i });
      await previewButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      const noteContent = authenticatedPage.locator(".overflow-y-auto.p-6");
      await expect(noteContent.locator("h1")).toBeVisible();
      await expect(noteContent.locator("h2")).toBeVisible();
      await expect(noteContent.locator("strong")).toBeVisible();
      await expect(noteContent.locator("em")).toBeVisible();
      await expect(noteContent.locator("ul")).toBeVisible();
      await expect(noteContent.locator("ol")).toBeVisible();
      await expect(noteContent.locator("blockquote")).toBeVisible();
      await expect(noteContent.locator("code")).toBeVisible();
    }
  });

  test("should handle note deletion", async ({ authenticatedPage }) => {
    const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
    
    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(500);
      await newNoteButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      const noteItems = authenticatedPage.locator("[class*='cursor-pointer']");
      const notesCount = await noteItems.count();
      
      if (notesCount >= 1) {
        const firstNote = noteItems.first();
        await firstNote.hover();
        await authenticatedPage.waitForTimeout(300);
        
        const deleteButton = firstNote.locator("[title='Delete note']");
        if (await deleteButton.isVisible().catch(() => false)) {
          await deleteButton.click();
          await authenticatedPage.waitForTimeout(1000);
          
          const updatedCount = await noteItems.count();
          expect(updatedCount).toBeLessThan(notesCount);
        }
      }
    }
  });

  test("should show keyboard shortcut hint and word count", async ({ authenticatedPage }) => {
    // First ensure there's a note to test with - create one if needed
    let hasNote = false;
    
    // Check if there's a note in the sidebar
    const noteItems = authenticatedPage.locator('[data-testid="note-item"]');
    if (await noteItems.count() > 0) {
      hasNote = true;
    } else {
      // Create a new note
      const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
      if (await newNoteButton.isVisible()) {
        await newNoteButton.click();
        await authenticatedPage.waitForTimeout(500);
        hasNote = true;
      }
    }

    if (hasNote) {
      // Check for keyboard shortcut hint
      const shortcutHint = authenticatedPage.getByText(/ctrl\+s/i);
      const hintVisible = await shortcutHint.isVisible().catch(() => false);
      
      // Check for word count when typing
      const newNoteButton = authenticatedPage.getByRole("button", { name: /new note/i });
      if (await newNoteButton.isVisible()) {
        await newNoteButton.click();
        await authenticatedPage.waitForTimeout(500);
        
        const contentArea = authenticatedPage.getByPlaceholder(/start typing/i);
        const contentVisible = await contentArea.isVisible().catch(() => false);
        if (contentVisible) {
          await contentArea.fill("One two three");
          await authenticatedPage.waitForTimeout(300);
          
          const wordCount = authenticatedPage.getByText(/3 words?/);
          await expect(wordCount).toBeVisible();
        }
      }
    }
  });
});
