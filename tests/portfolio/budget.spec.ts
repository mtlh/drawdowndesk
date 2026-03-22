import { test, expect } from "../auth/auth";

test.describe("Budget Page", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/budget");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  // ── Page load ────────────────────────────────────────────────────────────

  test("should load the budget page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("budget");
  });

  test("should display the budget page title and description", async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByRole("heading", { name: "Budget" })).toBeVisible();
    await expect(
      authenticatedPage.getByText("Track your monthly expenses as Needs vs Wants")
    ).toBeVisible();
  });

  test("should display Take-home pay income input", async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByText("Take-home pay")).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder("3000")).toBeVisible();
  });

  test("should display Add Expense button", async ({ authenticatedPage }) => {
    await expect(
      authenticatedPage.getByRole("button", { name: /add expense/i })
    ).toBeVisible();
  });

  test("should display summary cards (Needs, Wants, Total)", async ({ authenticatedPage }) => {
    // Summary cards show £0.00 when no expenses exist
    const cards = authenticatedPage.locator(".grid.grid-cols-3").first();
    await expect(cards).toBeVisible();
    await expect(authenticatedPage.getByText("Needs").first()).toBeVisible();
    await expect(authenticatedPage.getByText("Wants").first()).toBeVisible();
    await expect(authenticatedPage.getByText("Total").first()).toBeVisible();
  });

  test("should display empty state when no expenses exist", async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByRole("heading", { name: "Budget" })).toBeVisible();
    await expect(authenticatedPage.getByText("No expenses yet.")).toBeVisible();
  });

  // ── Income input ─────────────────────────────────────────────────────────

  test("should accept income value in the Take-home pay input", async ({ authenticatedPage }) => {
    const incomeInput = authenticatedPage.getByPlaceholder("3000");
    await incomeInput.fill("4000");
    await authenticatedPage.waitForTimeout(300);

    const inputValue = await incomeInput.inputValue();
    expect(inputValue).toBe("4000");
  });

  // ── Add Expense ─────────────────────────────────────────────────────────

  test("should open the Add Expense dialog when clicking Add Expense", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    const dialog = authenticatedPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(authenticatedPage.getByRole("heading", { name: "Add Expense" })).toBeVisible();
  });

  test("should show validation error when submitting empty expense form", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    // Click the submit button inside the dialog (not the trigger outside)
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    // Form should still be open (validation prevented submission)
    await expect(dialog).toBeVisible();
  });

  test("should close the Add Expense dialog when Cancel is clicked", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    const dialog = authenticatedPage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const cancelButton = dialog.getByRole("button", { name: /cancel/i });
    await cancelButton.click();
    await authenticatedPage.waitForTimeout(500);

    await expect(dialog).not.toBeVisible();
  });

  test("should close the Add Expense dialog when clicking the X button", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    const dialog = authenticatedPage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Close via aria-label or the SVG path inside the close button
    const closeButton = authenticatedPage.locator("[aria-label='Close']");
    await closeButton.click({ force: true });
    await authenticatedPage.waitForTimeout(500);

    await expect(dialog).not.toBeVisible();
  });

  test("should create an expense and show it in the list", async ({ authenticatedPage }) => {
    // Open dialog
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    // Fill name
    await authenticatedPage.getByLabel("Name").fill("Car Payment");
    await authenticatedPage.waitForTimeout(200);

    // Fill amount
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("200");
    await authenticatedPage.waitForTimeout(200);

    // Select category (Transport / Car)
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /transport/i }).click();
    await authenticatedPage.waitForTimeout(200);

    // Submit — click the button INSIDE the dialog
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    // Dialog should be closed
    await expect(dialog).not.toBeVisible();

    // Expense should appear in the list
    await expect(authenticatedPage.getByText("Car Payment")).toBeVisible();
    await expect(authenticatedPage.getByText("£200.00")).toBeVisible();
  });

  test("should show Need badge for a need-category expense", async ({ authenticatedPage }) => {
    // Open dialog
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    await authenticatedPage.getByLabel("Name").fill("Rent");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("1200");
    await authenticatedPage.waitForTimeout(200);

    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /housing/i }).click();
    await authenticatedPage.waitForTimeout(200);

    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    await expect(authenticatedPage.getByText("Rent")).toBeVisible();
    // Need badge should be present in the expense row
    await expect(authenticatedPage.locator("text=Need").first()).toBeVisible();
  });

  test("should show Want badge for a want-category expense", async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    await authenticatedPage.getByLabel("Name").fill("Netflix");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("15.99");
    await authenticatedPage.waitForTimeout(200);

    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /entertainment/i }).click();
    await authenticatedPage.waitForTimeout(200);

    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    await expect(authenticatedPage.getByText("Netflix")).toBeVisible();
    await expect(authenticatedPage.locator("text=Want").first()).toBeVisible();
  });

  // ── Icon picker ──────────────────────────────────────────────────────────

  test("should open the icon picker when clicking the icon button", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    // Click the icon picker button (shows the current icon name "Home")
    const iconButton = authenticatedPage.locator("button:has-text('Home')").first();
    await iconButton.click();
    await authenticatedPage.waitForTimeout(500);

    // Icon picker dialog should be visible
    await expect(authenticatedPage.getByRole("heading", { name: "Choose an Icon" })).toBeVisible();
  });

  test("should filter icons when searching in the icon picker", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    const iconButton = authenticatedPage.locator("button:has-text('Home')").first();
    await iconButton.click();
    await authenticatedPage.waitForTimeout(500);

    // Type in search
    await authenticatedPage.getByPlaceholder("Search icons…").fill("Car");
    await authenticatedPage.waitForTimeout(300);

    // Should show Car icon button
    await expect(authenticatedPage.locator("button:has-text('Car')").first()).toBeVisible();
  });

  // ── Income % display ────────────────────────────────────────────────────

  test("should show percentage of income in summary cards when income is set", async ({
    authenticatedPage,
  }) => {
    const incomeInput = authenticatedPage.getByPlaceholder("3000");
    await incomeInput.fill("3000");
    await authenticatedPage.waitForTimeout(500);

    // Percentage label should appear
    await expect(authenticatedPage.getByText(/of income/i).first()).toBeVisible();
  });

  test("should update expense amount percentage when income is entered", async ({
    authenticatedPage,
  }) => {
    // Add an expense first
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.getByLabel("Name").fill("Coffee");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("50");
    await authenticatedPage.waitForTimeout(200);
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /dining/i }).click();
    await authenticatedPage.waitForTimeout(200);
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    // Enter income
    const incomeInput = authenticatedPage.getByPlaceholder("3000");
    await incomeInput.fill("3000");
    await authenticatedPage.waitForTimeout(500);

    // Expense should show a percentage (1.7% for £50 of £3000)
    await expect(authenticatedPage.getByText("Coffee")).toBeVisible();
    await expect(authenticatedPage.getByText(/1\.\d%/i).first()).toBeVisible();
  });

  // ── Donut chart ─────────────────────────────────────────────────────────

  test("should display the Needs vs Wants donut chart when expenses exist", async ({
    authenticatedPage,
  }) => {
    // Create at least one expense
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.getByLabel("Name").fill("Spotify");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("10");
    await authenticatedPage.waitForTimeout(200);
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /subscriptions/i }).click();
    await authenticatedPage.waitForTimeout(200);
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    // Chart should be visible
    await expect(
      authenticatedPage.getByText("Needs vs Wants")
    ).toBeVisible();
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  test("should open edit dialog when clicking the pencil icon on an expense", async ({
    authenticatedPage,
  }) => {
    // First create an expense
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.getByLabel("Name").fill("Edit Me");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("100");
    await authenticatedPage.waitForTimeout(200);
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /food/i }).click();
    await authenticatedPage.waitForTimeout(200);
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    // Hover over the expense row to reveal edit button
    await authenticatedPage.getByText("Edit Me").hover();
    await authenticatedPage.waitForTimeout(300);

    // Click edit (pencil) button — the pencil path starts with M11
    const editButton = authenticatedPage.locator("button svg path[d*='M11']").first();
    await editButton.click({ force: true });
    await authenticatedPage.waitForTimeout(500);

    // Edit dialog should be visible
    await expect(authenticatedPage.getByRole("heading", { name: "Edit Expense" })).toBeVisible();
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test("should open delete confirmation when clicking delete on an expense", async ({
    authenticatedPage,
  }) => {
    // Create an expense to delete
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.getByLabel("Name").fill("Delete Me");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("99");
    await authenticatedPage.waitForTimeout(200);
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /utilities/i }).click();
    await authenticatedPage.waitForTimeout(200);
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    // Verify expense is in the list
    await expect(authenticatedPage.getByText("Delete Me")).toBeVisible();

    // Hover and click delete — the delete path starts with M3 6
    await authenticatedPage.getByText("Delete Me").hover();
    await authenticatedPage.waitForTimeout(300);

    const deleteButton = authenticatedPage.locator("button svg path[d*='M3 6']").first();
    await deleteButton.click({ force: true });
    await authenticatedPage.waitForTimeout(500);

    // Alert dialog should appear
    await expect(
      authenticatedPage.getByText(/delete expense\?/i)
    ).toBeVisible();

    // Cancel delete
    await authenticatedPage.getByRole("button", { name: /cancel/i }).last().click();
    await authenticatedPage.waitForTimeout(500);

    // Expense should still be visible
    await expect(authenticatedPage.getByText("Delete Me")).toBeVisible();
  });

  test("should actually delete an expense when confirming", async ({ authenticatedPage }) => {
    // Create an expense to delete
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.getByLabel("Name").fill("To Delete");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("50");
    await authenticatedPage.waitForTimeout(200);
    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /shopping/i }).click();
    await authenticatedPage.waitForTimeout(200);
    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    await expect(authenticatedPage.getByText("To Delete")).toBeVisible();

    await authenticatedPage.getByText("To Delete").hover();
    await authenticatedPage.waitForTimeout(300);

    const deleteButton = authenticatedPage.locator("button svg path[d*='M3 6']").first();
    await deleteButton.click({ force: true });
    await authenticatedPage.waitForTimeout(500);

    // Confirm deletion
    await authenticatedPage.getByRole("button", { name: /delete/i }).last().click();
    await authenticatedPage.waitForTimeout(2000);

    // Expense should be gone
    await expect(authenticatedPage.getByText("To Delete")).not.toBeVisible();
  });

  // ── Category override ────────────────────────────────────────────────────

  test("should allow overriding category type from Need to Want", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    await authenticatedPage.getByLabel("Name").fill("Classified as Want");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("150");
    await authenticatedPage.waitForTimeout(200);

    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /housing/i }).click(); // Housing is a Need by default
    await authenticatedPage.waitForTimeout(200);

    // Override classification
    await authenticatedPage.getByText("Override classification").click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("button", { name: /want/i }).click();
    await authenticatedPage.waitForTimeout(200);

    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    await expect(authenticatedPage.getByText("Classified as Want")).toBeVisible();
    await expect(authenticatedPage.locator("text=Want").first()).toBeVisible();
  });

  // ── Recurring toggle ────────────────────────────────────────────────────

  test("should create a non-recurring expense with recurring toggle unchecked", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(500);

    await authenticatedPage.getByLabel("Name").fill("One-off Repair");
    await authenticatedPage.getByLabel("Monthly Amount (£)").fill("300");
    await authenticatedPage.waitForTimeout(200);

    // Uncheck recurring
    const recurringCheckbox = authenticatedPage.getByLabel("Recurring monthly expense");
    await recurringCheckbox.click();
    await authenticatedPage.waitForTimeout(200);

    const categoryTrigger = authenticatedPage.getByPlaceholder("Select a category…");
    await categoryTrigger.click();
    await authenticatedPage.waitForTimeout(300);
    await authenticatedPage.getByRole("option", { name: /car/i }).click();
    await authenticatedPage.waitForTimeout(200);

    const dialog = authenticatedPage.getByRole("dialog");
    await dialog.getByRole("button", { name: /add expense/i }).click();
    await authenticatedPage.waitForTimeout(2000);

    await expect(authenticatedPage.getByText("One-off Repair")).toBeVisible();
  });

  // ── Cleanup helper ────────────────────────────────────────────────────────

  test("should delete all budget expenses created during tests", async ({
    authenticatedPage,
  }) => {
    // Navigate to budget page
    await authenticatedPage.goto("/budget");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);

    // Keep deleting the first expense row until none remain
    let iterations = 0;
    while (iterations < 20) {
      // Look for expense rows (they have the group class and contain action buttons)
      const expenseRows = authenticatedPage.locator(".group").filter({ has: authenticatedPage.locator("button") });
      const count = await expenseRows.count();

      if (count === 0) break;

      // Hover over first row and click delete
      await expenseRows.first().hover();
      await authenticatedPage.waitForTimeout(300);

      const deleteBtn = authenticatedPage.locator("button svg path[d*='M3 6']").first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        await deleteBtn.click({ force: true });
        await authenticatedPage.waitForTimeout(500);

        // Confirm delete
        const confirmBtn = authenticatedPage.getByRole("button", { name: /delete/i }).last();
        if (await confirmBtn.isVisible({ timeout: 1000 })) {
          await confirmBtn.click();
          await authenticatedPage.waitForTimeout(1500);
        }
      }

      iterations++;
    }
  });
});
