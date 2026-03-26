import { test, expect } from "@playwright/test";
import { uniqueEmail, registerAndLogin, createCategory } from "./helpers";

test.describe("Dashboard / Reports", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, uniqueEmail());
  });

  test("dashboard loads with summary cards and charts", async ({ page }) => {
    await page.goto("/");

    // Wait for loading to finish, then check summary cards
    await expect(page.getByText("Income").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Expenses").first()).toBeVisible();
    await expect(page.getByText("Net Balance")).toBeVisible();

    // Charts should be visible
    await expect(page.getByText("Spending by Category")).toBeVisible();
    await expect(page.getByText("Budget vs Spent")).toBeVisible();
    await expect(page.getByText(/monthly trend/i)).toBeVisible();
  });

  test("month selector navigates between months", async ({ page }) => {
    await page.goto("/");

    // Get current month name displayed
    const monthDisplay = page.locator("text=/[A-Z][a-z]+ \\d{4}/").first();
    const initialText = await monthDisplay.textContent();

    // Click previous month
    await page.getByRole("button", { name: "←" }).click();

    // Month should have changed
    await expect(monthDisplay).not.toHaveText(initialText!);

    // Click next month to go back
    await page.getByRole("button", { name: "→" }).click();
    await expect(monthDisplay).toHaveText(initialText!);
  });

  test("dashboard reflects transaction data", async ({ page }) => {
    // Create a category and transaction
    await createCategory(page, "E2E Dashboard Cat");

    await page.goto("/transactions");
    await page.getByRole("button", { name: /new transaction/i }).click();
    await page.getByLabel("Amount").fill("750.00");
    await page.getByLabel("Category").selectOption({ label: "E2E Dashboard Cat" });
    await page.getByLabel("Description").fill("Dashboard test txn");

    // Use current month date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    await page.getByLabel("Date").fill(dateStr);
    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByText("Dashboard test txn")).toBeVisible();

    // Go to dashboard — should show the expense
    await page.goto("/");
    await expect(page.getByText("$750.00")).toBeVisible();
  });
});
