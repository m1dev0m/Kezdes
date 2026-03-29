import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:5173';
const restaurantId = 6;
const ownerUsername = 'Meatp';
const ownerPassword = 'testpass123';

function localDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const guestName = `Smoke ${Date.now().toString().slice(-6)}`;
const guestPhone = `+7700${Date.now().toString().slice(-7)}`;
const bookingDate = localDateString();
const bookingTime = '19:00';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.setDefaultTimeout(20000);

async function shot(name) {
  await page.screenshot({ path: `/tmp/${name}.png`, full_page: true });
}

try {
  console.log('PUBLIC: open restaurant page');
  await page.goto(`${base}/restaurant/${restaurantId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByRole('link', { name: 'Book Table' }).first().click();

  console.log('PUBLIC: fill booking form');
  await page.waitForURL(new RegExp(`/restaurant/${restaurantId}/book`));
  await page.locator('input[type="date"]').fill(bookingDate);
  await page.locator('input[type="time"]').fill(bookingTime);
  await page.locator('input[type="number"]').fill('2');
  await page.getByLabel('Name').fill(guestName);
  await page.getByLabel('Phone').fill(guestPhone);
  await page.getByRole('button', { name: 'Reserve table' }).click();

  console.log('PUBLIC: verify confirmation');
  await page.waitForURL(new RegExp(`/restaurant/${restaurantId}/success`), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.getByText('Reservation created').waitFor();
  await page.getByText(guestPhone).waitFor();
  await shot('public-booking-success');

  console.log('ADMIN: login');
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Username').fill(ownerUsername);
  await page.locator('input[type="password"]').fill(ownerPassword);
  await page.getByRole('button', { name: /Initialize Session/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 30000 });

  console.log('ADMIN: open reservations');
  await page.goto(`${base}/app/bookings`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Search guest or phone').fill(guestName);

  const row = page.locator('tr', { hasText: guestName }).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });

  console.log('ADMIN: confirm');
  await row.getByRole('button', { name: 'Confirm' }).click();
  await row.getByText('Confirmed').waitFor({ timeout: 30000 });

  console.log('ADMIN: seat');
  await row.getByRole('button', { name: 'Seat' }).click();
  const modalButton = page.locator('button').filter({ hasText: /T-|\b\d\b|A\d|vip/i }).first();
  if (await modalButton.isVisible().catch(() => false)) {
    await modalButton.click();
    await page.getByRole('button', { name: 'Seat guest' }).last().click();
  }
  await row.getByText('Seated').waitFor({ timeout: 30000 });

  console.log('ADMIN: complete');
  await row.getByRole('button', { name: 'Complete' }).click();
  await page.waitForTimeout(1000);
  await page.locator('tr', { hasText: guestName }).first().waitFor({ state: 'hidden', timeout: 30000 });
  await shot('admin-booking-complete');

  console.log(JSON.stringify({
    status: 'ok',
    guestName,
    guestPhone,
    bookingDate,
    bookingTime,
    restaurantId,
    screenshots: ['/tmp/public-booking-success.png', '/tmp/admin-booking-complete.png']
  }, null, 2));
} catch (error) {
  console.error('SMOKE FAILED:', error);
  await shot('smoke-failure');
  console.error('Failure screenshot: /tmp/smoke-failure.png');
  process.exitCode = 1;
} finally {
  await browser.close();
}
