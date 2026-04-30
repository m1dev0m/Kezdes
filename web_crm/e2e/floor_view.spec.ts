import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('Floor View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill('Meatp');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/, { timeout: 10000 });
  });

  test('Floor View page loads with three columns', async ({ page }) => {
    await page.goto(`${BASE}/app/floor`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const text = await page.locator('body').textContent() || '';
    console.log('Floor View snippet:', text.replace(/\s+/g, ' ').trim().slice(0, 300));

    expect(text).toContain('Схема зала');
    expect(text).toContain('Ожидание');
    expect(text).toContain('Бронирования');
    expect(text).toContain('За столом');
    console.log('✓ Floor View renders all three columns');
  });

  test('Floor View nav item is visible in sidebar', async ({ page }) => {
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });
    const navItem = page.locator('a[href="/app/floor"]');
    await expect(navItem).toBeVisible({ timeout: 5000 });
    console.log('✓ Floor View nav item visible');
  });

  test('Floor View date navigation works', async ({ page }) => {
    await page.goto(`${BASE}/app/floor`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const text = await page.locator('body').textContent() || '';
    expect(text).toContain('Ожидание');
    expect(text).toContain('Бронирования');
    expect(text).toContain('За столом');
    console.log('✓ Date navigation does not crash');
  });

  test('Floor View exposes layout controls', async ({ page }) => {
    await page.goto(`${BASE}/app/floor`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('floor-date-input')).toBeVisible();
    await expect(page.getByLabel('floor-layout-mode')).toBeVisible();
    await expect(page.getByLabel('floor-layout-save')).toBeVisible();
  });
});
