import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill('Meatp');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app\
  });

  test('calendar exposes explicit date controls', async ({ page }) => {
    await page.goto(`${BASE}/app/calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('calendar-date-input')).toBeVisible();
    await expect(page.getByLabel('calendar-today')).toBeVisible();

    await page.getByLabel('calendar-today').click();
    await expect(page.getByLabel('calendar-date-input')).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  });
});
