import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const configuredRestaurantId = process.env.SMOKE_RESTAURANT_ID ? Number(process.env.SMOKE_RESTAURANT_ID) : null;
const ownerPassword = process.env.SMOKE_OWNER_PASSWORD ?? 'testpass123';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000/api/v1';

function getDateString(offset: number) {
  const next = new Date();
  next.setDate(next.getDate() + offset);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadRestaurantIds() {
  if (configuredRestaurantId && !Number.isNaN(configuredRestaurantId)) {
    return [configuredRestaurantId];
  }

  const response = await fetch(`${apiURL}/restaurants/?page=1&page_size=10`);
  if (!response.ok) {
    throw new Error(`Unable to load restaurants for smoke test: ${response.status}`);
  }

  const payload = (await response.json()) as { results?: Array<{ id: number }> };
  const restaurantIds = payload.results?.map((restaurant) => restaurant.id).filter(Boolean) ?? [];
  if (restaurantIds.length === 0) {
    throw new Error('Pilot MVP smoke requires at least one restaurant in the database.');
  }

  return restaurantIds;
}

async function resolveBookingTarget(guests = 2) {
  const restaurantIds = await loadRestaurantIds();

  for (const restaurantId of restaurantIds) {
    for (let offset = 1; offset <= 7; offset += 1) {
      const date = getDateString(offset);
      const response = await fetch(
        `${apiURL}/bookings/available_slots/?restaurant_id=${restaurantId}&date=${date}&guests=${guests}`,
      );
      if (!response.ok) continue;

      const payload = (await response.json()) as { slots?: string[]; available_slots?: string[] };
      const slots = Array.isArray(payload.slots)
        ? payload.slots
        : Array.isArray(payload.available_slots)
          ? payload.available_slots
          : [];

      if (slots.length > 0) {
        return { restaurantId, date, time: slots[0] };
      }
    }
  }

  throw new Error('No available booking slots found from tomorrow through the next 7 days for any visible restaurant.');
}

function ensureSmokeOwnerCredentials(restaurantId: number) {
  if (process.env.SMOKE_OWNER_USERNAME && process.env.SMOKE_OWNER_PASSWORD) {
    return {
      username: process.env.SMOKE_OWNER_USERNAME,
      password: process.env.SMOKE_OWNER_PASSWORD,
    };
  }

  const username = execFileSync(
    '../backend/venv/bin/python',
    [
      '../backend/manage.py',
      'shell',
      '-c',
      [
        'from restaurants.models import Restaurant',
        `restaurant = Restaurant.objects.select_related("owner").get(id=${restaurantId})`,
        'assert restaurant.owner_id, "Selected restaurant has no owner"',
        `restaurant.owner.set_password(${JSON.stringify(ownerPassword)})`,
        'restaurant.owner.save(update_fields=["password"])',
        'print(restaurant.owner.username)',
      ].join('; '),
    ],
    { encoding: 'utf-8' },
  )
    .trim()
    .split('\n')
    .pop();

  if (!username) {
    throw new Error(`Unable to resolve owner username for restaurant ${restaurantId}.`);
  }

  return { username, password: ownerPassword };
}

test.describe('Pilot MVP flow', () => {
  test('guest books and staff completes reservation', async ({ page }) => {
    test.setTimeout(90_000);

    const bookingTarget = await resolveBookingTarget();
    const { restaurantId } = bookingTarget;
    const ownerCredentials = ensureSmokeOwnerCredentials(restaurantId);
    const suffix = Date.now().toString().slice(-6);
    const guestName = `Smoke ${suffix}`;
    const guestPhone = `+7700${suffix}${suffix.slice(-1)}`;

    await page.goto(`/restaurant/${restaurantId}`);
    await page.getByRole('link', { name: 'restaurant-book' }).click();

    await expect(page).toHaveURL(new RegExp(`/restaurant/${restaurantId}/book\\?date=`));
    await page.getByLabel('booking-date').fill(bookingTarget.date);
    await page.getByLabel('booking-guests').fill('2');
    const preferredSlot = page.getByLabel(`booking-slot-${bookingTarget.time}`);
    await expect(preferredSlot).toBeVisible({ timeout: 30_000 });
    await preferredSlot.click();
    await page.getByLabel('booking-name').fill(guestName);
    await page.getByLabel('booking-phone').fill(guestPhone);
    await page.getByRole('button', { name: 'booking-submit' }).click();

    await expect(page).toHaveURL(new RegExp(`/restaurant/${restaurantId}/success`));
    await expect(page.getByRole('heading', { name: 'booking-confirmation-title' })).toBeVisible();
    await expect(page.locator('[aria-label="booking-confirmation-phone"]')).toContainText(guestPhone);

    await page.goto('/login');
    await page.locator('input[name="username"]').fill(ownerCredentials.username);
    await page.locator('input[name="password"]').fill(ownerCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/app\/dashboard/, { timeout: 30_000 });

    await page.goto('/app/bookings');
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await page.getByLabel('reservations-search').fill(guestName);

    const row = page.locator('tr', { hasText: guestName }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();

    await page.locator('[aria-label^="reservation-confirm-selected-"]').click();
    await expect(row.locator('[aria-label="reservation-status-confirmed"]')).toBeVisible({ timeout: 30_000 });

    await page.locator('[aria-label^="reservation-seat-selected-"]').click();
    const tableChoice = page.locator('button[aria-label^="table-choice-"]').first();
    if (await tableChoice.isVisible().catch(() => false)) {
      await tableChoice.click();
      await page.getByRole('button', { name: 'table-picker-confirm' }).click();
    }
    await expect(row.locator('[aria-label="reservation-status-seated"]')).toBeVisible({ timeout: 30_000 });

    await row.click();
    await page.locator('[aria-label^="reservation-complete-selected-"]').click();
    await expect(row.locator('[aria-label="reservation-status-completed"]')).toBeVisible({ timeout: 30_000 });
  });
});
