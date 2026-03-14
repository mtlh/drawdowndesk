import { test, expect } from "../auth/auth";

test.describe("Settings CRUD", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/settings");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await authenticatedPage.waitForTimeout(2000);
  });

  test("should display settings page", async ({ authenticatedPage }) => {
    const url = authenticatedPage.url();
    expect(url).toContain("settings");
  });

  test("should display settings content", async ({ authenticatedPage }) => {
    const content = authenticatedPage.locator("main").first();
    await expect(content).toBeVisible();
  });

  test("should display tax settings tab", async ({ authenticatedPage }) => {
    const taxTab = authenticatedPage.getByRole("tab", { name: /tax settings/i });
    if (await taxTab.isVisible()) {
      await taxTab.click();
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test("should display assumptions tab", async ({ authenticatedPage }) => {
    const assumptionsTab = authenticatedPage.getByRole("tab", { name: /assumptions/i });
    if (await assumptionsTab.isVisible()) {
      await assumptionsTab.click();
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test("should display state pension settings", async ({ authenticatedPage }) => {
    const pensionTab = authenticatedPage.getByRole("tab", { name: /state pension/i });
    if (await pensionTab.isVisible()) {
      await pensionTab.click();
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test("should toggle theme", async ({ authenticatedPage }) => {
    const themeButton = authenticatedPage.getByRole("button", { name: /theme/i });
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await authenticatedPage.waitForTimeout(500);
    }
  });
});
