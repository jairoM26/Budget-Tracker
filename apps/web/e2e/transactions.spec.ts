import { test, expect } from "@playwright/test";

// Each test run uses a unique email to avoid conflicts between runs
function uniqueEmail() {
  return `e2e-${Date.now()}@example.com`;
}

async function registerAndLogin(page: import("@playwright/test").Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/");
}

test.describe("Transactions journey", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = uniqueEmail();
    await registerAndLogin(page, email);
  });

  test("create → view → edit → delete a transaction", async ({ page }) => {
    // Navigate to categories first to create one (transactions require a category)
    await page.goto("/categories");
    await page.getByRole("button", { name: /new category/i }).click();
    await page.getByLabel("Name").fill("E2E Groceries");
    // Type defaults to "Both" — leave as is
    await page.getByRole("button", { name: /create category/i }).click();

    // Wait for the category to appear in the list
    await expect(page.getByText("E2E Groceries")).toBeVisible();

    // Navigate to transactions
    await page.goto("/transactions");

    // ── CREATE ──────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /new transaction/i }).click();

    await page.getByLabel("Amount").fill("42.00");
    // Type defaults to Expense — leave as is
    await page.getByLabel("Category").selectOption({ label: "E2E Groceries" });
    await page.getByLabel("Description").fill("E2E weekly shop");
    await page.getByLabel("Date").fill("2026-03-15");
    await page.getByRole("button", { name: /add transaction/i }).click();

    // ── VIEW ─────────────────────────────────────────────────────────────────
    await expect(page.getByText("E2E weekly shop")).toBeVisible();
    await expect(page.getByText("-$42.00")).toBeVisible();

    // ── EDIT ─────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /edit/i }).first().click();

    // Form should be pre-filled
    await expect(page.getByLabel("Amount")).toHaveValue("42.00");
    await expect(page.getByLabel("Description")).toHaveValue("E2E weekly shop");

    await page.getByLabel("Description").fill("E2E weekly shop (updated)");
    await page.getByLabel("Amount").fill("55.50");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Updated values appear in the list
    await expect(page.getByText("E2E weekly shop (updated)")).toBeVisible();
    await expect(page.getByText("-$55.50")).toBeVisible();

    // ── DELETE ───────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /delete/i }).first().click();

    // Confirm delete
    await page.getByRole("button", { name: /confirm delete/i }).click();

    // List should be empty
    await expect(page.getByText("No transactions yet.")).toBeVisible();
  });

  test("filters narrow the transaction list", async ({ page }) => {
    // Create a category
    await page.goto("/categories");
    await page.getByRole("button", { name: /new category/i }).click();
    await page.getByLabel("Name").fill("Filter Test Cat");
    await page.getByRole("button", { name: /create category/i }).click();
    await expect(page.getByText("Filter Test Cat")).toBeVisible();

    await page.goto("/transactions");

    // Create an EXPENSE transaction
    await page.getByRole("button", { name: /new transaction/i }).click();
    await page.getByLabel("Amount").fill("10.00");
    await page.getByLabel("Category").selectOption({ label: "Filter Test Cat" });
    await page.getByLabel("Description").fill("Expense txn");
    await page.getByLabel("Date").fill("2026-03-01");
    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByText("Expense txn")).toBeVisible();

    // Create an INCOME transaction
    await page.getByRole("button", { name: /new transaction/i }).click();
    await page.getByLabel("Type").selectOption("INCOME");
    await page.getByLabel("Amount").fill("200.00");
    await page.getByLabel("Category").selectOption({ label: "Filter Test Cat" });
    await page.getByLabel("Description").fill("Income txn");
    await page.getByLabel("Date").fill("2026-03-01");
    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByText("Income txn")).toBeVisible();

    // Apply type filter = EXPENSE
    await page.locator("select").first().selectOption("EXPENSE");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page.getByText("Expense txn")).toBeVisible();
    await expect(page.getByText("Income txn")).not.toBeVisible();

    // Clear filters
    await page.getByRole("button", { name: /clear filters/i }).click();

    await expect(page.getByText("Expense txn")).toBeVisible();
    await expect(page.getByText("Income txn")).toBeVisible();
  });
});
