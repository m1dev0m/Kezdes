import { expect, test } from "@playwright/test";

test.describe("MVP Web Smoke", () => {
  test("public landing loads and has auth links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Kezdes").first()).toBeVisible();

    // Landing has register/join links
    await expect(page.locator("a[href='/register']").first()).toBeVisible();

    // Navigate to login directly
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();

    // Navigate to register
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("register supports restaurant mode", async ({ page }) => {
    await page.goto("/register?mode=restaurant");
    await expect(page).toHaveURL(/\/register\?mode=restaurant$/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("protected restaurant dashboard redirects guests to login", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
  });
});

