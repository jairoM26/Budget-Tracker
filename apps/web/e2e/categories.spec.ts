import { test, expect } from "@playwright/test";
import { uniqueEmail, registerAndLogin } from "./helpers";

test.describe("Categories journey", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, uniqueEmail());
  });

  test("create → edit → delete a category", async ({ page }) => {
    await page.goto("/categories");

    // ── CREATE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /new category/i }).click();
    await page.locator("#cat-name").fill("E2E Transport");
    await page.getByRole("button", { name: /create category/i }).click();
    await expect(page.getByText("E2E Transport")).toBeVisible();

    // ── EDIT ────────────────────────────────────────────────
    await page.getByRole("button", { name: /edit/i }).first().click();
    await page.locator("#cat-name").fill("E2E Transport (renamed)");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("E2E Transport (renamed)")).toBeVisible();

    // ── DELETE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /delete/i }).first().click();
    await page.getByRole("button", { name: /confirm delete/i }).click();
    await expect(page.getByText("E2E Transport (renamed)", { exact: true })).not.toBeVisible();
  });

  test("shows reassign flow when deleting category with transactions", async ({ page }) => {
    // Create two categories
    await page.goto("/categories");
    await page.getByRole("button", { name: /new category/i }).click();
    await page.locator("#cat-name").fill("Cat A");
    await page.getByRole("button", { name: /create category/i }).click();
    await expect(page.getByText("Cat A")).toBeVisible();

    await page.getByRole("button", { name: /new category/i }).click();
    await page.locator("#cat-name").fill("Cat B");
    await page.getByRole("button", { name: /create category/i }).click();
    await expect(page.getByText("Cat B")).toBeVisible();

    // Create a transaction under Cat A
    await page.goto("/transactions");
    await page.getByRole("button", { name: /new transaction/i }).click();
    await page.getByLabel("Amount").fill("10.00");
    await page.getByLabel("Category").selectOption({ label: "Cat A" });
    await page.getByLabel("Description").fill("Test txn");
    await page.getByLabel("Date").fill("2026-03-01");
    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByText("Test txn")).toBeVisible();

    // Try to delete Cat A — should show reassign flow
    await page.goto("/categories");
    // Find the Cat A card and click delete
    const catARow = page.locator(".rounded-lg.border").filter({ hasText: "Cat A" }).first();
    await catARow.getByRole("button", { name: /delete/i }).click();
    await catARow.getByRole("button", { name: /confirm delete/i }).click();

    // Reassign flow should appear
    await expect(page.getByText(/linked transaction/i)).toBeVisible();
  });
});
