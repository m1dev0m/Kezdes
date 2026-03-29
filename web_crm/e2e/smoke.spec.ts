import { expect, test } from "@playwright/test";

test.describe("MVP Web Smoke", () => {
  test("public landing loads and has auth links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "public-home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "public-register" })).toBeVisible();

    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();

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

  test("public booking route renders when a restaurant exists", async ({ page }) => {
    const restaurantId = Number(process.env.SMOKE_RESTAURANT_ID ?? 1);

    await page.goto(`/restaurant/${restaurantId}`);
    await expect(page.getByRole("link", { name: "restaurant-book" })).toBeVisible();
    await page.getByRole("link", { name: "restaurant-book" }).click();
    await expect(page).toHaveURL(`/restaurant/${restaurantId}/book`);
    await expect(page.getByLabel("booking-date")).toBeVisible();
    await expect(page.getByLabel("booking-time")).toBeVisible();
    await expect(page.getByLabel("booking-guests")).toBeVisible();
    await expect(page.getByRole("button", { name: "booking-submit" })).toBeVisible();
  });

  test("admin login form has stable selectors", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[name='username']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
  });

  test("admin reservations shell renders with auth token", async ({ page }) => {
    test.skip(!process.env.SMOKE_ACCESS_TOKEN, "SMOKE_ACCESS_TOKEN is required for authenticated shell verification.");

    await page.addInitScript((token) => {
      window.localStorage.setItem("accessToken", token);
    }, process.env.SMOKE_ACCESS_TOKEN as string);

    if (process.env.SMOKE_REFRESH_TOKEN) {
      await page.addInitScript((token) => {
        window.localStorage.setItem("refreshToken", token);
      }, process.env.SMOKE_REFRESH_TOKEN);
    }

    await page.goto("/app/bookings");
    await expect(page.getByLabel("reservations-search")).toBeVisible();
    await expect(page.getByRole("link", { name: "reservation-new" })).toBeVisible();
  });
});
