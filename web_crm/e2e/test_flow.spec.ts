import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

test.use({ baseURL: 'http://localhost:5173' });

test('Full E2E User Journey (Registration -> Booking -> Confirmation)', async ({ page }) => {
    // Increase test timeout to 120s
    test.setTimeout(120_000);
    const ts = Date.now();

    // =======================================================
    // 1. Restaurant Owner Registration
    // =======================================================
    await page.goto('/register?mode=restaurant');

    const ownerEmail = `owner_${ts}@test.com`;
    const ownerUser = `owner_${ts}`;
    const restaurantName = `Test Venue ${ts}`;

    await page.fill('input[placeholder="username"]', ownerUser);
    await page.fill('input[placeholder="you@example.com"]', ownerEmail);
    await page.fill('input[type="tel"]', '+77051234567');
    await page.fill('input[placeholder="Gastro Bar"]', restaurantName);

    const pwdInputs = page.locator('input[placeholder="••••••••"]');
    await pwdInputs.nth(0).fill('Pass1234!');
    await pwdInputs.nth(1).fill('Pass1234!');

    await page.click('button[type="submit"]');

    // Should navigate to pending
    await expect(page).toHaveURL(/.*\/register-restaurant\/pending/, { timeout: 15000 });
    await expect(page.locator('text=Аккаунт создан')).toBeVisible({ timeout: 10000 });

    // =======================================================
    // 2. Automate Backend Approval using Django Script
    // =======================================================
    const scriptPath = path.resolve(process.cwd(), '../backend/approve_latest.py');
    const pythonScript = `
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import RestaurantRequest
from restaurants.services import RestaurantService

req = RestaurantRequest.objects.filter(name="${restaurantName}").first()
if req:
    res, err = RestaurantService.approve_request(req.id)
    if err:
        print("Error:", err)
    else:
        print(f"Approved ID {req.id}")
else:
    print("Request not found")
`;

    fs.writeFileSync(scriptPath, pythonScript);

    // Execute via POSIX-compliant dot
    const output = execSync(`cd ../backend && . .venv/bin/activate && python3 approve_latest.py`).toString();

    // =======================================================
    // 3. Login as the newly approved Owner
    // =======================================================
    await page.goto('/login');
    // Use correct placeholder from Login.tsx
    await page.fill('input[placeholder="your@email.com"]', ownerUser);
    await page.fill('input[placeholder="••••••••"]', 'Pass1234!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/app\/dashboard/, { timeout: 20000 });

    // Quick check: go to Tables page and add a table
    await page.goto('/app/tables');
    // Use Russian text from i18n
    await page.click('button:has-text("Добавить стол")');
    await page.waitForTimeout(1500);

    // Identify inputs by their sibling labels
    await page.locator('label:has-text("Номер стола") + input').fill('T1');
    await page.locator('label:has-text("Количество мест") + input').fill('4');

    await page.click('button:has-text("Сохранить")');
    await page.waitForTimeout(3000);

    // Logout owner
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // =======================================================
    // 4. Customer Flow: Search and Book
    // =======================================================
    await page.goto('/register?mode=customer');

    const custEmail = `cust_${ts}@test.com`;
    const custUser = `cust_${ts}`;

    // Use Russian placeholder from i18n for 'Имя Иванов'
    await page.fill('input[placeholder="Иван Иванов"]', 'Иван Гость');
    await page.fill('input[placeholder="username"]', custUser);
    await page.fill('input[placeholder="you@example.com"]', custEmail);
    await page.fill('input[placeholder="+7 (777) 000-0000"]', '+77011112233');
    const pwdInputs2 = page.locator('input[placeholder="••••••••"]');
    await pwdInputs2.nth(0).fill('Pass1234!');
    await pwdInputs2.nth(1).fill('Pass1234!');

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/guest\/dashboard/, { timeout: 20000 });

    await page.goto('/discover');
    // Use Russian placeholder from i18n
    await page.fill('input[placeholder="Поиск ресторана или адреса"]', restaurantName);
    await page.waitForTimeout(3000);

    await page.click(`text=${restaurantName}`);
    await expect(page).toHaveURL(/.*\/restaurant\/\d+/, { timeout: 15000 });

    await page.click('a:has-text("Reserve a Table")');

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', tomorrowStr);
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Подтвердить бронирование")');

    // Wait for success screen
    await expect(page).toHaveURL(/.*\/restaurant\/\d+\/success/, { timeout: 20000 });
    await expect(page.locator('text=Booking Requested!')).toBeVisible();

});
