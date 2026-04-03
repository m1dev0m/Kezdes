import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('Register flow', () => {
  test('register completes via OTP and lands on role selection', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const username = `e2e_user_${suffix}`;
    const email = `e2e_user_${suffix}@test.local`;
    const password = 'StrongPass123!';
    const phone = '+77010000000';

    await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('manager_admin').fill(username);
    await page.getByPlaceholder('name@example.com').fill(email);
    await page.getByPlaceholder('+7 700 000 00 00').fill(phone);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);

    const otpResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/v1/auth/send-otp/') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Отправить код' }).click();

    const otpResponse = await otpResponsePromise;
    expect(otpResponse.ok()).toBeTruthy();
    const otpData = (await otpResponse.json()) as { code?: string; detail?: string; otp_required?: boolean };
    const debugCodeBanner = page.getByText(/Dev OTP code:/);
    const fallbackDebugCode =
      (await debugCodeBanner.count())
        ? (await debugCodeBanner.textContent())?.match(/\b\d{6}\b/)?.[0]
        : undefined;
    const otpCode = otpData.code || fallbackDebugCode || '123456';
    await expect(page.getByPlaceholder('123456')).toBeVisible();

    await page.getByPlaceholder('123456').fill(otpCode);
    await page.getByRole('button', { name: 'Подтвердить и войти' }).click();

    await expect(page).toHaveURL(/\/role-selection$/);
    await page.getByRole('button', { name: /Продолжить как гость/ }).click();

    await expect(page).toHaveURL(/\/restaurants(\?.*)?$/);
  });
});
