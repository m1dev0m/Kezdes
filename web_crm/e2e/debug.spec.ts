import { test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

test('debug: inspect bookings page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="text"], input[type="email"]').first().fill('Meatp');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app\

    await page.goto(`${BASE}/app/bookings`);
    await page.waitForTimeout(3000);

    console.log('\n=== URL ===', page.url());

    const buttons = await page.locator('button').allTextContents();
    console.log('\n=== BUTTONS ===', JSON.stringify(buttons));

    const inputs = await page.locator('input').evaluateAll((els: HTMLInputElement[]) =>
        els.map(e => ({ placeholder: e.placeholder, type: e.type }))
    );
    console.log('\n=== INPUTS ===', JSON.stringify(inputs));

    
    const text = await page.locator('body').textContent();
    console.log('\n=== BODY TEXT (500 chars) ===', text?.slice(0, 500));

    
    await page.goto(`${BASE}/book/6`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    const bookText = await page.locator('body').textContent();
    console.log('\n=== /book/6 TEXT (300 chars) ===', bookText?.slice(0, 300));
    console.log('\n=== /book/6 URL ===', page.url());
});
