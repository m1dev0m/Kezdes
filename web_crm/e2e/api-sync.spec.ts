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
    await page.locator('input[name="username"]').fill("sync_user@test.local");
    await page.locator('input[name="password"]').fill("pass12345");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect.poll(() => loginPayload).not.toBeNull();
    expect(loginPayload).toEqual({
      username: "sync_user@test.local",
      password: "pass12345",
    });
  });

  test("register flow sends expected OTP, registration, and login payloads", async ({ page }) => {
    const email = "sync_register@test.local";
    const username = "sync_register";
    const password = "Pass12345!";

    let otpPayload: Record<string, string> | null = null;
    let registerPayload: Record<string, unknown> | null = null;
    let loginPayload: Record<string, string> | null = null;

    await page.route("**/api/v1/auth/send-otp/", async (route) => {
      otpPayload = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Код отправлен на ваш email.",
          code: "424242",
        }),
      });
    });

    await page.route("**/api/v1/auth/register/", async (route) => {
      registerPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            username,
            email,
            role: "pending",
          },
          message: "User registered successfully",
        }),
      });
    });

    await page.route("**/api/v1/auth/login/", async (route) => {
      loginPayload = route.request().postDataJSON() as Record<string, string>;
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
          username,
          email,
          role: "pending",
          restaurant_verified: false,
          restaurant_setup_required: false,
        }),
      });
    });

    await page.goto("/register");
    await page.getByPlaceholder("manager_admin").fill(username);
    await page.getByPlaceholder("name@example.com").fill(email);
    await page.getByPlaceholder("+7 700 000 00 00").fill("+77010000000");
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole("button", { name: "Отправить код" }).click();

    await expect.poll(() => otpPayload).not.toBeNull();
    expect(otpPayload).toEqual({ email });

    await page.getByPlaceholder("123456").fill("424242");
    await page.getByRole("button", { name: "Подтвердить и войти" }).click();

    await expect.poll(() => registerPayload).not.toBeNull();
    expect(registerPayload).toMatchObject({
      username,
      email,
      password,
      password2: password,
      phone: "+77010000000",
      otp_code: "424242",
    });
    expect(registerPayload).not.toHaveProperty("role");

    await expect.poll(() => loginPayload).not.toBeNull();
    expect(loginPayload).toEqual({
      username,
      password,
    });

    await expect(page).toHaveURL(/\/role-selection$/);
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
    await page.locator('input[type="date"]').fill("2030-01-10");
    await page.locator('input[type="time"]').fill("19:00");
    await page.locator('input[name="name"]').fill("API Sync User");
    await page.locator('input[name="phone"]').fill("+77010000000");
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
