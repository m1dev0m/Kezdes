import { expect, test } from '@playwright/test';

const restaurantId = Number(process.env.SMOKE_RESTAURANT_ID ?? 6);
const ownerUsername = process.env.SMOKE_OWNER_USERNAME ?? 'Meatp';
const ownerPassword = process.env.SMOKE_OWNER_PASSWORD ?? 'testpass123';

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Pilot MVP flow', () => {
  test('guest books and staff completes reservation', async ({ page }) => {
    test.setTimeout(90_000);

    const suffix = Date.now().toString().slice(-6);
    const guestName = `Smoke ${suffix}`;
    const guestPhone = `+7700${suffix}${suffix.slice(-1)}`;
    const bookingDate = localDateString();

    await page.goto(`/restaurant/${restaurantId}`);
    await page.getByRole('link', { name: 'restaurant-book' }).click();

    await expect(page).toHaveURL(`/restaurant/${restaurantId}/book`);
    await page.getByLabel('booking-date').fill(bookingDate);
    await page.getByLabel('booking-time').fill('19:00');
    await page.getByLabel('booking-guests').fill('2');
    await page.getByLabel('booking-name').fill(guestName);
    await page.getByLabel('booking-phone').fill(guestPhone);
    await page.getByRole('button', { name: 'booking-submit' }).click();

    await expect(page).toHaveURL(new RegExp(`/restaurant/${restaurantId}/success`));
    await expect(page.getByRole('heading', { name: 'booking-confirmation-title' })).toBeVisible();
    await expect(page.locator('[aria-label="booking-confirmation-phone"]')).toContainText(guestPhone);

    await page.goto('/login');
    await page.locator('input[name="username"]').fill(ownerUsername);
    await page.locator('input[name="password"]').fill(ownerPassword);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/app\/dashboard/, { timeout: 30_000 });

    await page.goto('/app/bookings');
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
    await expect(page.locator('tr', { hasText: guestName })).toHaveCount(0, { timeout: 30_000 });
  });
});
