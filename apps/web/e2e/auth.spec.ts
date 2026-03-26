import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test.describe("Auth journey", () => {
  test("register → login → logout", async ({ page }) => {
    const email = uniqueEmail();

    // ── REGISTER ──────────────────────────────────────────────
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /budget tracker/i })).toBeVisible();

    await page.getByLabel("Name").fill("Auth Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("/");
    await expect(page.getByText("Dashboard")).toBeVisible();

    // ── LOGOUT ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /sign out/i }).first().click();
    await page.waitForURL("/login");

    // ── LOGIN ──────────────────────────────────────────────────
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/");
    await expect(page.getByText("Dashboard")).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test("shows error for duplicate registration", async ({ page }) => {
    const email = uniqueEmail();

    // Register first time
    await page.goto("/register");
    await page.getByLabel("Name").fill("First User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL("/");

    // Logout
    await page.getByRole("button", { name: /sign out/i }).first().click();
    await page.waitForURL("/login");

    // Try to register again with same email
    await page.goto("/register");
    await page.getByLabel("Name").fill("Duplicate User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible();
  });

  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/categories");
    await page.waitForURL("/login");
  });
});
