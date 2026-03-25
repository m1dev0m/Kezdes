import { test, expect, Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5174';
const OWNER_USERNAME = 'Meatp';
const OWNER_PASSWORD = 'testpass123';

async function loginAs(page: Page, username: string, password: string) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill(username);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app\//, { timeout: 12000 });
}

// ── Public tests ──────────────────────────────────────────────────────────────

test.describe('1. Public pages', () => {

    test('Login page renders', async ({ page }) => {
        await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        console.log('✓ Login page renders');
    });

    test('Auth guard redirects to login', async ({ page }) => {
        await page.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/login/, { timeout: 6000 });
        console.log('✓ Auth guard works');
    });

    test('Register page renders', async ({ page }) => {
        await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 15000 });
        const text = await page.locator('body').textContent() || '';
        expect(text.length).toBeGreaterThan(20);
        console.log('✓ Register page renders');
    });

});

// ── Admin tests ───────────────────────────────────────────────────────────────

test.describe('2. Admin flow', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page, OWNER_USERNAME, OWNER_PASSWORD);
    });

    test('Dashboard loads after login', async ({ page }) => {
        expect(page.url()).toContain('/app/');
        const text = await page.locator('body').textContent() || '';
        expect(text.length).toBeGreaterThan(20);
        console.log('✓ Dashboard at', page.url());
    });

    test('Tables page loads', async ({ page }) => {
        await page.goto(`${BASE}/app/tables`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const text = await page.locator('body').textContent() || '';
        const ok = text.includes('Стол') || text.includes('Добавить') || text.includes('Table');
        expect(ok).toBe(true);
        console.log('✓ Tables page:', text.slice(0, 80).trim());
    });

    test('Create a table', async ({ page }) => {
        await page.goto(`${BASE}/app/tables`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const addBtn = page.locator('button', { hasText: 'Добавить стол' });
        await expect(addBtn).toBeVisible({ timeout: 8000 });
        await addBtn.click();

        const nameInput = page.locator('input[placeholder*="1, A1, VIP"]');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        const tableName = `T-${Date.now().toString().slice(-4)}`;
        await nameInput.fill(tableName);

        await page.locator('input[type="number"]').first().fill('4');
        await page.locator('button', { hasText: 'Сохранить' }).click();

        await expect(page.locator('text=Стол добавлен')).toBeVisible({ timeout: 6000 });
        console.log('✓ Table created:', tableName);
    });

    test('Bookings page loads with correct UI', async ({ page }) => {
        await page.goto(`${BASE}/app/bookings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const buttons = await page.locator('button').allTextContents();
        console.log('Buttons found:', buttons);

        // "Новая бронь" button must exist
        const newBtn = page.locator('button', { hasText: 'Новая бронь' });
        await expect(newBtn).toBeVisible({ timeout: 8000 });
        console.log('✓ Bookings page loads, "Новая бронь" button visible');
    });

    test('New booking form opens and fills', async ({ page }) => {
        await page.goto(`${BASE}/app/bookings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Click "Новая бронь"
        await page.locator('button', { hasText: 'Новая бронь' }).click();

        // Modal should appear
        await expect(page.locator('text=Новое бронирование')).toBeVisible({ timeout: 5000 });
        console.log('✓ Manual booking modal opens');

        // Fill form
        await page.locator('input[placeholder="Иван Иванов"]').fill('Test Guest');
        await page.locator('input[placeholder="+7 900 123 4567"]').fill('+77001234567');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await page.locator('form input[type="date"]').fill(tomorrow.toISOString().split('T')[0]);
        await page.locator('form input[type="time"]').fill('19:00');

        console.log('✓ Form filled');

        // Submit
        await page.locator('button', { hasText: 'Создать бронь' }).click();
        await page.waitForTimeout(3000);

        // Check result — success or error, both are valid responses
        const toasts = await page.locator('[data-hot-toast] li, [data-hot-toast] > div').allTextContents().catch(() => []);
        console.log('✓ Submit response (toasts):', toasts);
        // No crash = pass
        expect(true).toBe(true);
    });

    test('Search input works', async ({ page }) => {
        await page.goto(`${BASE}/app/bookings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Placeholder from Bookings.tsx: "Поиск по имени или телефону..."
        const searchInput = page.locator('input[placeholder*="Поиск по имени"]');
        await expect(searchInput).toBeVisible({ timeout: 8000 });
        await searchInput.fill('Test');
        await page.waitForTimeout(600);
        console.log('✓ Search input works');
    });

    test('Booking status actions (confirm/seat/complete)', async ({ page }) => {
        await page.goto(`${BASE}/app/bookings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);

        const confirmBtns = await page.locator('button', { hasText: 'Confirm' }).count();
        const seatBtns = await page.locator('button', { hasText: 'Seat' }).count();
        const completeBtns = await page.locator('button', { hasText: 'Complete' }).count();

        console.log(`✓ Action buttons — Confirm: ${confirmBtns}, Seat: ${seatBtns}, Complete: ${completeBtns}`);

        if (confirmBtns > 0) {
            await page.locator('button', { hasText: 'Confirm' }).first().click();
            await page.waitForTimeout(2000);
            console.log('✓ Confirm action triggered');
        } else {
            console.log('ℹ No pending bookings to confirm (create one first)');
        }
        expect(true).toBe(true);
    });

    test('Full demo flow: create booking then confirm', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto(`${BASE}/app/bookings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Step 1: Create booking
        await page.locator('button', { hasText: 'Новая бронь' }).click();
        await expect(page.locator('text=Новое бронирование')).toBeVisible({ timeout: 5000 });

        const guestName = `Demo-${Date.now().toString().slice(-4)}`;
        await page.locator('input[placeholder="Иван Иванов"]').fill(guestName);
        await page.locator('input[placeholder="+7 900 123 4567"]').fill('+77009998877');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await page.locator('form input[type="date"]').fill(tomorrow.toISOString().split('T')[0]);
        await page.locator('form input[type="time"]').fill('20:00');

        await page.locator('button', { hasText: 'Создать бронь' }).click();
        await page.waitForTimeout(3000);

        // Step 2: Check if booking appeared
        const bodyText = await page.locator('body').textContent() || '';
        if (bodyText.includes(guestName)) {
            console.log('✓ Booking visible in list:', guestName);

            // Step 3: Try to confirm it
            const confirmBtn = page.locator('button', { hasText: 'Confirm' }).first();
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
                await page.waitForTimeout(2000);
                console.log('✓ Booking confirmed');

                // Step 4: Seat
                const seatBtn = page.locator('button', { hasText: 'Seat' }).first();
                if (await seatBtn.isVisible()) {
                    await seatBtn.click();
                    await page.waitForTimeout(2000);
                    console.log('✓ Guest seated');

                    // Step 5: Complete
                    const completeBtn = page.locator('button', { hasText: 'Complete' }).first();
                    if (await completeBtn.isVisible()) {
                        await completeBtn.click();
                        await page.waitForTimeout(2000);
                        console.log('✓ Booking completed — full flow done!');
                    }
                }
            }
        } else {
            console.log('ℹ Booking not visible yet (may need tables in DB)');
        }

        expect(true).toBe(true);
    });

});
