import { expect, test } from "@playwright/test";

test.describe("Web API Sync", () => {
  test("login form sends expected payload to backend", async ({ page }) => {
    let loginPayload: Record<string, string> | null = null;

    await page.route("**/api/v1/auth/login/", async (route) => {
      const req = route.request();
      loginPayload = req.postDataJSON() as Record<string, string>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access: "fake-access-token",
          refresh: "fake-refresh-token",
        }),
      });
    });

    await page.route("**/api/v1/auth/me/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          username: "sync_user",
          email: "sync_user@test.local",
          role: "customer",
          restaurant_verified: true,
          restaurant_setup_required: false,
        }),
      });
    });

    await page.goto("/login");
    await page.fill("input[placeholder='your@email.com']", "sync_user@test.local");
    await page.fill("input[placeholder='••••••••']", "pass12345");
    await page.locator("button[type='submit']").click();

    await expect.poll(() => loginPayload).not.toBeNull();
    expect(loginPayload).toEqual({
      username: "sync_user@test.local",
      password: "pass12345",
    });
  });

  test("booking page sends backend-compatible payload", async ({ page }) => {
    let bookingPayload: Record<string, unknown> | null = null;

    await page.route("**/api/v1/bookings/available_slots/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: ["19:00", "19:30"] }),
      });
    });

    await page.route("**/api/v1/bookings/", async (route) => {
      bookingPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 99,
          status: "pending",
          date: "2030-01-10",
          time: "19:00",
          guests: 2,
        }),
      });
    });

    await page.goto("/restaurant/1/book");
    await page.fill("input[name='date']", "2030-01-10");
    await page.fill("input[name='user_name']", "API Sync User");
    await page.fill("input[name='user_phone']", "+77010000000");
    await page.locator("button:has-text('19:00')").click();
    await page.locator("button[type='submit']").click();

    await expect.poll(() => bookingPayload).not.toBeNull();
    expect(bookingPayload).toMatchObject({
      restaurant: 1,
      date: "2030-01-10",
      time: "19:00",
      guests: 2,
      user_name: "API Sync User",
      user_phone: "+77010000000",
    });
    expect(bookingPayload).not.toHaveProperty("user_email");
  });
});
