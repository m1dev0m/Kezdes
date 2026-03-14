import { expect, test } from "@playwright/test";

test.describe("MVP Web Smoke", () => {
  test("public landing loads and opens auth pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Kezdes").first()).toBeVisible();

    await page.locator("a[href='/login']").first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();

    await page.goto("/");
    await page.locator("a[href='/register']").first().click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("register supports restaurant mode", async ({ page }) => {
    await page.goto("/register?mode=restaurant");
    await expect(page).toHaveURL(/\/register\?mode=restaurant$/);

    await expect(page.locator("input[placeholder='username']")).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("protected restaurant dashboard redirects guests to login", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
  });
});

