import type { Page } from "@playwright/test";

export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

export async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/");
}

export async function createCategory(
  page: Page,
  name: string,
  options: { type?: string } = {}
) {
  await page.goto("/categories");
  await page.getByRole("button", { name: /new category/i }).click();
  await page.locator("#cat-name").fill(name);
  if (options.type) {
    await page.getByLabel("Type").selectOption(options.type);
  }
  await page.getByRole("button", { name: /create category/i }).click();
  await page.getByText(name).waitFor();
}
