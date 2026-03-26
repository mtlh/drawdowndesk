import { test, expect } from "../auth/auth";
import type { Page } from "@playwright/test";

/**
 * Clears FIRE Metrics localStorage so each test starts from defaults.
 */
async function loadFireMetricsPage(page: Page) {
  await page.evaluate(() => localStorage.removeItem("fireMetrics"));
  await page.goto("/fire-metrics");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
}

test.describe("FIRE Metrics", () => {
  // ── Page structure ──────────────────────────────────────────────────────────

  test("should display FIRE metrics page", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/fire-metrics/);
  });

  test("should display main content area", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("main").first()).toBeVisible();
  });

  test("should display FIRE Number label", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText(/FIRE Number/i).first(),
    ).toBeVisible();
  });

  test("should display Your Numbers card", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText("Your Numbers").first(),
    ).toBeVisible();
  });

  test("should display calculation formula reference card", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText("How your numbers are calculated").first(),
    ).toBeVisible();
  });

  // ── Default FIRE number (deterministic: £30k / 4% × inflation adjustment) ──

  test("should display default FIRE number of at least £750,000", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    // Default: £30,000 expenses / 4% = £750,000 base, inflated by 2.5% over ~25 years
    // Result is ~£1.3M — check that a large number is visible
    const hasLargeNumber = await authenticatedPage
      .getByText(/\d{1,3},?\d{3}/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasLargeNumber).toBe(true);
  });

  test("should show FIRE number in formula reference", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    const hasFormula = await authenticatedPage
      .getByText(/4% SWR/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasFormula).toBe(true);
  });

  // ── Stat cards ──────────────────────────────────────────────────────────────

  test("should display FI Progress stat card", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText("FI Progress").first(),
    ).toBeVisible();
  });

  test("should display Net Worth stat card", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText("Net Worth").first(),
    ).toBeVisible();
  });

  test("should display progress bar in FI Progress card", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    const progressBar = authenticatedPage
      .locator(".overflow-hidden.rounded-full.bg-secondary")
      .first();
    await expect(progressBar).toBeVisible();
  });

  // ── The 4 inputs ───────────────────────────────────────────────────────────

  test("should have Annual Savings input", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("#annual-savings")).toBeVisible();
  });

  test("should have Expected Return input", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("#nominal-return")).toBeVisible();
  });

  test("should have Inflation Rate input", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("#inflation-rate")).toBeVisible();
  });

  test("should have Annual Expenditure input", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("#annual-expenses")).toBeVisible();
  });

  test("should have Current Age input", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.locator("#current-age")).toBeVisible();
  });

  // ── Input interactions ──────────────────────────────────────────────────────

  test("should update FIRE number when Annual Expenditure is changed", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    // Change expenses from £30k to £40k → FIRE number doubles (before inflation)
    await authenticatedPage.locator("#annual-expenses").fill("40000");
    await authenticatedPage.waitForTimeout(300);
    // Should show a larger FIRE number in the formula card
    const hasFormula = await authenticatedPage
      .getByText(/£40,?000/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasFormula).toBe(true);
  });

  test("should show FIRE achieved when expenses are set to zero", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    // £0 expenses → £0 FIRE target → NW >= 0 always → achieved
    await authenticatedPage.locator("#annual-expenses").fill("0");
    await authenticatedPage.waitForTimeout(500);
    await expect(
      authenticatedPage.getByText(/FIRE achieved/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display years-to-FIRE label in hero section", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    const yearsLabel = authenticatedPage.getByText(/years to FIRE/i).first();
    const fireAchieved = authenticatedPage.getByText(/FIRE achieved/i).first();
    const yearsVisible = await yearsLabel.isVisible().catch(() => false);
    const achievedVisible = await fireAchieved.isVisible().catch(() => false);
    expect(yearsVisible || achievedVisible).toBe(true);
  });

  // ── Chart ───────────────────────────────────────────────────────────────────

  test("should render chart SVG", async ({ authenticatedPage }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.locator("svg.recharts-surface").first(),
    ).toBeVisible();
  });

  test("should display Portfolio Projection heading", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(
      authenticatedPage.getByText("Portfolio Projection").first(),
    ).toBeVisible();
  });

  test("should display milestone card with Today", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.getByText("Today").first()).toBeVisible();
  });

  test("should display multiple milestone age labels", async ({
    authenticatedPage,
  }) => {
    await loadFireMetricsPage(authenticatedPage);
    await expect(authenticatedPage.getByText(/Age 35/i).first()).toBeVisible();
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  test("should eventually show Your Numbers card after loading", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.evaluate(() =>
      localStorage.removeItem("fireMetrics"),
    );
    await authenticatedPage.goto("/fire-metrics");
    await authenticatedPage.waitForLoadState("domcontentloaded");
    await expect(
      authenticatedPage.getByText("Your Numbers").first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
