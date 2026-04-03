import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill('Meatp');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app\//, { timeout: 12000 });
  });

  test('dashboard exposes operational quick actions', async ({ page }) => {
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'Открыть схему' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Открыть календарь' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать бронь' }).first()).toBeVisible();
  });

  test('header calendar shortcut opens calendar view', async ({ page }) => {
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });

    await page.getByLabel('admin-header-open-calendar').click();
    await page.waitForURL(/\/app\/calendar$/, { timeout: 10000 });
    await expect(page.getByLabel('calendar-date-input')).toBeVisible();
  });
});
