import { test, expect } from "@playwright/test";
import { uniqueEmail, registerAndLogin, createCategory } from "./helpers";

test.describe("Budgets journey", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, uniqueEmail());
    await createCategory(page, "E2E Food");
  });

  test("create → view → edit → delete a budget", async ({ page }) => {
    await page.goto("/budgets");

    // ── CREATE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /new budget/i }).click();
    await page.getByLabel("Year").fill("2026");
    await page.getByLabel("Month").selectOption("3");
    await page.getByLabel("Total limit").fill("2000.00");
    await page.getByRole("button", { name: /create budget/i }).click();

    await expect(page.getByText("March 2026")).toBeVisible();
    await expect(page.getByText("$2,000.00")).toBeVisible();

    // ── EDIT ────────────────────────────────────────────────
    await page.getByRole("button", { name: /edit/i }).first().click();
    await page.getByLabel("Total limit").fill("3000.00");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText("$3,000.00")).toBeVisible();

    // ── DELETE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /delete/i }).first().click();
    await page.getByRole("button", { name: /confirm delete/i }).click();
    await expect(page.getByText("No budgets yet.")).toBeVisible();
  });

  test("budget shows progress against spending", async ({ page }) => {
    // Create a transaction first
    await page.goto("/transactions");
    await page.getByRole("button", { name: /new transaction/i }).click();
    await page.getByLabel("Amount").fill("500.00");
    await page.getByLabel("Category").selectOption({ label: "E2E Food" });
    await page.getByLabel("Description").fill("Big grocery run");
    await page.getByLabel("Date").fill("2026-03-10");
    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByText("Big grocery run")).toBeVisible();

    // Create a budget for March 2026 with category limit for E2E Food
    await page.goto("/budgets");
    await page.getByRole("button", { name: /new budget/i }).click();
    await page.getByLabel("Year").fill("2026");
    await page.getByLabel("Month").selectOption("3");
    await page.getByLabel("Total limit").fill("1000.00");
    // Set category limit for E2E Food — find the row with the category name and its sibling input
    const foodRow = page.locator(".flex.items-center.gap-3").filter({ hasText: "E2E Food" });
    await foodRow.locator("input").fill("800.00");
    await page.getByRole("button", { name: /create budget/i }).click();

    // Should show spent amount (format: "$500.00 spent of $1,000.00 total limit")
    await expect(page.getByText(/500\.00 spent/)).toBeVisible();
  });
});
