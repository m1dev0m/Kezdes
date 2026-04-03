import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const OWNER_USERNAME = 'Meatp';
const OWNER_PASSWORD = 'testpass123';

test.describe('Auth flow', () => {
  test('login redirects a valid restaurant user into the admin app', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Логин').fill(OWNER_USERNAME);
    await page.getByLabel('Пароль').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Операционная картина на сегодня' })).toBeVisible();
  });

  test('login page keeps the current public form contract', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByLabel('Логин')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Зарегистрировать ресторан/ })).toBeVisible();
  });
});
