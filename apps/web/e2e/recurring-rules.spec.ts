import { test, expect } from "@playwright/test";
import { uniqueEmail, registerAndLogin, createCategory } from "./helpers";

test.describe("Recurring rules journey", () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, uniqueEmail());
    await createCategory(page, "E2E Rent");
  });

  test("create → view → pause → resume → delete a recurring rule", async ({ page }) => {
    await page.goto("/recurring-rules");

    // ── CREATE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /new rule/i }).click();
    await page.getByLabel("Amount").fill("1200.00");
    await page.getByLabel("Category").selectOption({ label: "E2E Rent" });
    await page.getByLabel("Description").fill("Monthly rent");
    await page.getByLabel("Frequency").selectOption("MONTHLY");
    await page.getByLabel(/start date/i).fill("2026-04-01");
    await page.getByRole("button", { name: /create rule/i }).click();

    // Should show the new rule
    await expect(page.getByText("Monthly rent")).toBeVisible();
    await expect(page.getByText("$1,200.00")).toBeVisible();
    await expect(page.getByText(/Monthly · Next/)).toBeVisible();

    // ── PAUSE ───────────────────────────────────────────────
    await page.getByRole("button", { name: /pause/i }).first().click();
    await expect(page.getByText(/paused/i)).toBeVisible();

    // ── RESUME ──────────────────────────────────────────────
    await page.getByRole("button", { name: /resume/i }).first().click();
    await expect(page.getByText("Paused")).not.toBeVisible();

    // ── DELETE ──────────────────────────────────────────────
    await page.getByRole("button", { name: /delete/i }).first().click();
    await page.getByRole("button", { name: /confirm delete/i }).click();
    await expect(page.getByText("No recurring rules yet.")).toBeVisible();
  });
});
