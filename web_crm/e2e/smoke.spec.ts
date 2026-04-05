import { expect, test, type Page } from "@playwright/test";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

async function installCorsPreflight(page: Page) {
  await page.route(/\/api\/v1\/.*/, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.fallback();
  });
}

async function loginAsOwner(page: Page) {
  await installCorsPreflight(page);

  await page.route("**/api/v1/auth/login/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: JSON.stringify({ access: "smoke-access-token", refresh: "smoke-refresh-token" }),
    });
  });

  await page.route("**/api/v1/auth/me**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: JSON.stringify({
        id: 1,
        username: "owner_smoke",
        email: "owner_smoke@test.local",
        role: "owner",
        restaurant: 1,
        restaurant_verified: true,
        restaurant_setup_required: false,
        profile: {
          role: "owner",
          restaurant: 1,
        },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Логин").fill("owner_smoke");
  await page.getByLabel("Пароль").fill("testpass123");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/app\/dashboard$/, { timeout: 12000 });
}

async function loginAsManager(page: Page) {
  await installCorsPreflight(page);

  await page.route("**/api/v1/auth/login/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: JSON.stringify({ access: "smoke-access-token", refresh: "smoke-refresh-token" }),
    });
  });

  await page.route("**/api/v1/auth/me**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: JSON.stringify({
        id: 2,
        username: "manager_smoke",
        email: "manager_smoke@test.local",
        role: "manager",
        restaurant: 1,
        restaurant_verified: true,
        restaurant_setup_required: true,
        profile: {
          role: "manager",
          restaurant: 1,
        },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Логин").fill("manager_smoke");
  await page.getByLabel("Пароль").fill("testpass123");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/app\/dashboard$/, { timeout: 12000 });
}

test.describe("MVP Web Smoke", () => {
  test("public landing loads and has auth links", async ({ page }) => {
    await mockGuestAuth(page);
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
    await mockGuestAuth(page);
    await page.goto("/register?mode=restaurant");
    await expect(page).toHaveURL(/\/register\?mode=restaurant$/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("protected restaurant dashboard redirects guests to login", async ({ page }) => {
    await mockGuestAuth(page);
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("setup-restaurant is not the default route for non-owner roles", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/setup-restaurant");
    await expect(page).toHaveURL(/\/app\/dashboard$/);
  });

  test("public booking route renders when a restaurant exists", async ({ page }) => {
    const restaurantId = Number(process.env.SMOKE_RESTAURANT_ID ?? 1);
    await mockGuestAuth(page);

    await page.route(`**/api/v1/restaurants/${restaurantId}/`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: restaurantId,
          name: "Meatpoint",
          address: "Almaty, Test Street 1",
          opening_time: "10:00:00",
          closing_time: "23:00:00",
          description: "Smoketest restaurant",
          rating: 4.8,
          capacity: 120,
          max_party_size: 8,
          deposit_required: false,
          image_url: null,
          photo_url: null,
        }),
      });
    });

    await page.route(`**/api/v1/restaurants/${restaurantId}/reviews/`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/bookings/available_slots/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: ["19:00"] }),
      });
    });

    await page.goto(`/restaurant/${restaurantId}`);
    await expect(page.getByRole("link", { name: "restaurant-book" })).toBeVisible();
    await page.getByRole("link", { name: "restaurant-book" }).click();
    await expect(page).toHaveURL(new RegExp(`/restaurant/${restaurantId}/book\\?date=`));
    await expect(page.getByLabel("booking-date")).toBeVisible();
    await expect(page.getByLabel("booking-time")).toBeVisible();
    await expect(page.getByLabel("booking-guests")).toBeVisible();
    await expect(page.getByRole("button", { name: "booking-submit" })).toBeVisible();
  });

  test("admin login form has stable selectors", async ({ page }) => {
    await mockGuestAuth(page);
    await page.goto("/login");
    await expect(page.locator("input[name='username']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
  });

  test("admin reservations page supports search and manual create", async ({ page }) => {
    await loginAsOwner(page);
    const today = new Date().toISOString().split("T")[0];
    const reservations = Array.from({ length: 26 }, (_, index) => ({
      id: index + 1,
      restaurant: 1,
      user: index === 3 ? 44 : null,
      user_name: `Smoke Guest ${index + 1}`,
      user_phone: `+7700000${String(index + 1).padStart(3, "0")}`,
      date: today,
      time: `${String(18 + (index % 4)).padStart(2, "0")}:00`,
      guests: 2,
      status: index === 0 ? "pending" : "confirmed",
      table_number: index === 3 ? "VIP-3" : `T-${index + 1}`,
      created_at: new Date().toISOString(),
    }));

    await page.route(/\/api\/v1\/bookings\/my_restaurant\/.*/, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.has("limit")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: CORS_HEADERS,
          body: JSON.stringify(reservations),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: reservations.length,
          next: null,
          previous: null,
          results: reservations.slice(0, 25),
        }),
      });
    });

    await page.route("**/api/v1/tables/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/bookings/available_tables/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          available_tables: [],
          available_table_ids: [],
        }),
      });
    });

    await page.goto("/app/bookings");
    await expect(page.getByLabel("reservations-search")).toBeVisible();
    await expect(page.getByLabel("reservations-manual-create")).toBeVisible();
    await expect(page.getByText("Страница 1 из 2")).toBeVisible();

    await page.getByLabel("reservations-search").fill("Smoke Guest 4");
    await expect(page.getByLabel("reservation-row-4")).toBeVisible();
    await expect(page.getByLabel("reservation-row-1")).toHaveCount(0);

    await page.getByLabel("reservations-manual-create").click();
    await expect(page.getByLabel("manual-booking-close")).toBeVisible();
  });

  test("admin waitlist route is reachable from CRM", async ({ page }) => {
    await loginAsOwner(page);

    await page.route(/\/api\/v1\/bookings\/waitlist\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 41,
              restaurant: 1,
              restaurant_name: "Smoke Restaurant",
              user_name: "Waitlist Guest",
              date: "2030-01-10",
              time: "19:00:00",
              guests: 2,
              status: "waiting",
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto("/app/waitlist");
    await expect(page).toHaveURL(/\/app\/waitlist$/);
    await expect(page.getByRole("heading", { name: "Лист ожидания" })).toBeVisible();
    await expect(page.getByText("Waitlist Guest")).toBeVisible();
  });

  test("admin booking context opens messages for reservations outside the first page", async ({ page }) => {
    await loginAsOwner(page);
    const today = new Date().toISOString().split("T")[0];
    const legacyDate = "2025-01-10";
    const reservations = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      restaurant: 1,
      user: index === 0 ? 44 : null,
      user_name: `Smoke Guest ${index + 1}`,
      user_phone: `+7700001${String(index + 1).padStart(3, "0")}`,
      date: today,
      time: `${String(18 + (index % 4)).padStart(2, "0")}:00`,
      guests: 2,
      status: "confirmed",
      table_number: `T-${index + 1}`,
      created_at: new Date().toISOString(),
    }));

    await page.route(/\/api\/v1\/bookings\/my_restaurant\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: reservations.length,
          next: null,
          previous: null,
          results: reservations,
        }),
      });
    });

    await page.route(/\/api\/v1\/bookings\/999\/?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 999,
          restaurant: 1,
          user: 44,
          user_name: "Legacy Guest",
          user_phone: "+77000999000",
          date: legacyDate,
          time: "13:30",
          guests: 4,
          status: "completed",
          table_number: "LEG-9",
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/chat/conversations/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.route(/\/api\/v1\/chat\/messages\/?/, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("booking") === "999") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: CORS_HEADERS,
          body: JSON.stringify([
            {
              id: 1,
              content: "Legacy hello",
              timestamp: new Date().toISOString(),
              sender: 44,
              sender_username: "legacy_guest",
              sender_name: "Legacy Guest",
              booking: 999,
              restaurant: 1,
              conversation: 1,
              is_read: true,
            },
          ]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.route("**/api/v1/chat/messages/mark_read/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ updated: 1 }),
      });
    });

    await page.goto("/app/bookings?id=999");
    await expect(page.getByLabel("reservation-row-999")).toBeVisible();
    await page.getByLabel("reservation-chat-999").click();

    await expect(page).toHaveURL(/\/app\/messages$/);
    await expect(page.getByRole("heading", { name: "Legacy Guest" })).toBeVisible();
    await expect(page.getByText("Legacy hello")).toBeVisible();
  });

  test("admin orders page renders with stable empty state", async ({ page }) => {
    await loginAsOwner(page);

    await page.route("**/api/v1/restaurants/subscription/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 1,
          name: "Smoke Restaurant",
          status: "active",
          plan: "pro",
          plan_label: "Pro",
          payment_status: "paid",
          payment_status_label: "Paid",
          is_subscription_live: true,
          subscription_state: "active",
          limits: {},
          usage: {},
          usage_percent: {},
          features: [{ key: "orders_basic", label: "Orders", enabled: true }],
          checklist: [],
          feature_flags: { orders_basic: true },
          invoices: [],
        }),
      });
    });

    await page.route("**/api/v1/restaurants/subscription/audit/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v1\/orders\/my_restaurant\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      });
    });

    await page.goto("/app/orders");
    await expect(page).toHaveURL(/\/app\/orders$/);
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();
    await expect(page.getByText("Нет заказов")).toBeVisible();
  });

  test("admin quick actions lead to live operational routes", async ({ page }) => {
    await loginAsOwner(page);

    await page.route("**/api/v1/restaurants/subscription/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 1,
          name: "Smoke Restaurant",
          status: "active",
          plan: "pro",
          plan_label: "Pro",
          payment_status: "paid",
          payment_status_label: "Paid",
          is_subscription_live: true,
          subscription_state: "active",
          limits: {},
          usage: {},
          usage_percent: {},
          features: [],
          checklist: [],
          feature_flags: {},
          invoices: [],
        }),
      });
    });

    await page.route("**/api/v1/restaurants/subscription/audit/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v1\/bookings\/my_restaurant\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      });
    });

    await page.route("**/api/v1/tables/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/restaurants/shifts/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.goto("/app/dashboard");
    await page.getByLabel("admin-header-open-calendar").click();
    await expect(page).toHaveURL(/\/app\/calendar$/);

    await page.goto("/app/dashboard");
    const firstRunSection = page.locator("section").filter({ hasText: "Первый запуск" }).first();
    await firstRunSection.getByRole("button", { name: /Открыть схему|Собрать схему/i }).first().click();
    await expect(page).toHaveURL(/\/app\/floor$/);
  });

  test("floor view renders restaurant-owned shapes", async ({ page }) => {
    await loginAsOwner(page);

    await page.route(/\/api\/v1\/bookings\/my_restaurant\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      });
    });

    await page.route("**/api/v1/tables/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([
          {
            id: 1,
            name: "T-1",
            capacity: 4,
            x: 120,
            y: 160,
            width: 92,
            height: 92,
            rotation: 0,
            table_type: "square",
            status: "free",
            is_active: true,
          },
        ]),
      });
    });

    await page.route("**/api/v1/restaurants/shifts/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/restaurants/floor-shapes/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([
          {
            id: 77,
            restaurant: 1,
            zone: null,
            name: "Бар",
            shape_type: "label",
            x: 300,
            y: 80,
            width: 140,
            height: 44,
            rotation: 0,
            fill_color: "#ffffff",
            stroke_color: "#ffffff",
            text_color: "#0f172a",
            z_index: 1,
            is_visible: true,
          },
        ]),
      });
    });

    await page.goto("/app/floor");
    await expect(page).toHaveURL(/\/app\/floor$/);
    await expect(page.getByRole("heading", { name: "Схема зала" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Бар" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Новый элемент" })).toBeVisible();
  });

  test("messages can open a direct thread from booking context", async ({ page }) => {
    await loginAsOwner(page);

    await page.route(/\/api\/v1\/bookings\/my_restaurant\/.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 501,
              restaurant: 1,
              user: 44,
              user_name: "Direct Guest",
              user_phone: "+77005550000",
              date: "2030-01-10",
              time: "19:00",
              guests: 2,
              status: "confirmed",
              table_number: "A-1",
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route("**/api/v1/chat/conversations/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      });
    });

    await page.route("**/api/v1/chat/conversations/start/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 88,
          restaurant: 1,
          guest: 44,
          guest_name: "Direct Guest",
          last_message: null,
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.route(/\/api\/v1\/chat\/messages\/\?.*/, async (route) => {
      const url = new URL(route.request().url());
      const conversationId = url.searchParams.get("conversation");
      if (conversationId === "88") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: CORS_HEADERS,
          body: JSON.stringify([
            {
              id: 1,
              content: "Прямой привет",
              timestamp: new Date().toISOString(),
              sender: 44,
              sender_username: "direct_guest",
              sender_name: "Direct Guest",
              booking: null,
              restaurant: 1,
              conversation: 88,
              is_read: true,
            },
          ]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/chat/messages/mark_read/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ updated: 1 }),
      });
    });

    await page.goto("/app/messages");
    await expect(page.getByRole("button", { name: /Direct Guest/i })).toBeVisible();
    await page.getByRole("button", { name: /Direct Guest/i }).click();
    await page.getByRole("button", { name: "ПРЯМОЙ ДИАЛОГ" }).click();

    await expect(page.getByText("Прямой привет")).toBeVisible();
    await expect(page.getByText("Прямая связь с клиентом")).toBeVisible();
  });

  test("BookPage query params overload does not infinite loop", async ({ page }) => {
    const restaurantId = 1;
    await mockGuestAuth(page);

    await page.route(`**/api/v1/restaurants/${restaurantId}/`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: restaurantId, name: "Smoke Restaurant" }),
      });
    });

    await page.route("**/api/v1/bookings/available_slots/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: ["19:00"] }) });
    });

    await page.goto(`/restaurant/${restaurantId}/book?guests=abc&date=&waitlist=1`);
    
    await expect(page.getByLabel("booking-guests")).toHaveValue("2");
    
    await page.getByLabel("booking-name").fill("Test Name");
    await page.getByLabel("booking-phone").fill("77000000000");
    await expect(page.getByRole("button", { name: "booking-waitlist" })).toBeVisible();
  });

  test("Dashboard withstands null starts_at from API", async ({ page }) => {
    await loginAsOwner(page);

    await page.route("**/api/v1/restaurants/shifts/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify([{ id: 99, name: "Broken Shift", starts_at: null, ends_at: null }]),
      });
    });

    await page.goto("/app/dashboard");
    await expect(page.getByText("Смены не настроены")).toBeVisible();
  });
});

async function mockGuestAuth(page: Page) {
  await page.route("**/api/v1/auth/me**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Unauthorized" }),
    });
  });
}
