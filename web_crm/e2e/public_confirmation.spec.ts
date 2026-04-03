import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const RESTAURANT_ID = Number(process.env.SMOKE_RESTAURANT_ID ?? 1);

test.describe('Public confirmation self-service', () => {
  test('restores booking confirmation from session storage and cancels by public token', async ({ page }) => {
    const bookingDate = getAlmatyDate(1);
    const booking = {
      id: 901,
      public_token: 'public-token-smoke-901',
      status: 'pending',
      restaurant_name: 'Meatpoint',
      date: bookingDate,
      time: '19:00',
      guests: 2,
      user_name: 'Public Smoke Guest',
      user_phone: '+77010000000',
      restaurant: RESTAURANT_ID,
      can_be_cancelled: true,
    };

    let bookingStatus = 'pending';
    await page.route('**/api/v1/bookings/public/public-token-smoke-901/', async (route) => {
      const payload = {
        ...booking,
        status: bookingStatus,
        can_be_cancelled: bookingStatus === 'pending',
      };

      if (route.request().method() === 'DELETE') {
        bookingStatus = 'cancelled_by_user';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...payload,
            status: bookingStatus,
            can_be_cancelled: false,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    const confirmationState = {
      reservationId: booking.id,
      restaurantId: RESTAURANT_ID,
      restaurantName: booking.restaurant_name,
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      guestName: booking.user_name,
      phone: booking.user_phone,
      status: booking.status,
      reservationKind: 'booking' as const,
      publicToken: booking.public_token,
      canBeCancelled: true,
      referenceCode: `BK-${booking.id}`,
    };

    await page.addInitScript((payload) => {
      window.sessionStorage.setItem(`kezdes:reservation-success:${payload.restaurantId}`, JSON.stringify(payload));
      window.sessionStorage.setItem(`kezdes:booking-success:${payload.restaurantId}`, JSON.stringify(payload));
    }, confirmationState);

    await page.goto(`${BASE}/restaurant/${RESTAURANT_ID}/success`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('booking-confirmation-title')).toBeVisible();
    await expect(page.getByText(/Управление без аккаунта/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отменить по ссылке' })).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Код заявки' })).toBeVisible();

    await page.getByRole('button', { name: 'Отменить по ссылке' }).click();
    await expect(page.getByText('Бронирование отменено')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отменить по ссылке' })).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Бронирование отменено')).toBeVisible();
    await expect(page.getByText(`BK-${booking.id}`)).toBeVisible();
  });

  test('restores waitlist confirmation state and keeps the flow honest', async ({ page }) => {
    const bookingDate = getAlmatyDate(1);
    const waitlistState = {
      reservationId: 9001,
      restaurantId: RESTAURANT_ID,
      restaurantName: 'Meatpoint',
      date: bookingDate,
      time: '19:00',
      guests: 2,
      guestName: 'Waitlist Smoke Guest',
      phone: '+77010000001',
      status: 'waitlist',
      reservationKind: 'waitlist' as const,
      referenceCode: 'WL-9001',
      canBeCancelled: false,
    };

    await page.addInitScript((payload) => {
      window.sessionStorage.setItem(`kezdes:reservation-success:${payload.restaurantId}`, JSON.stringify(payload));
      window.sessionStorage.setItem(`kezdes:waitlist-success:${payload.restaurantId}`, JSON.stringify(payload));
    }, waitlistState);

    await page.goto(`${BASE}/restaurant/${RESTAURANT_ID}/success`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('booking-confirmation-title')).toHaveText('Запрос в лист ожидания отправлен');
    await expect(page.getByText(/В листе ожидания/)).toBeVisible();
    await expect(page.getByText(/Управление без аккаунта/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Отменить по ссылке' })).toHaveCount(0);
    await expect(page.locator('dt', { hasText: 'Код заявки' })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('booking-confirmation-title')).toHaveText('Запрос в лист ожидания отправлен');
    await expect(page.getByText('WL-9001')).toBeVisible();
  });

  test('restaurant waitlist CTA stays explicit and routes into booking flow', async ({ page }) => {
    await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: RESTAURANT_ID,
          name: 'Meatpoint',
          address: 'Almaty, Test Street 1',
          opening_time: '10:00:00',
          closing_time: '23:00:00',
          description: 'Smoketest restaurant',
          rating: 4.8,
          capacity: 120,
          max_party_size: 8,
          deposit_required: false,
          image_url: null,
          photo_url: null,
        }),
      });
    });

    await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/reviews/`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/bookings/available_slots/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ slots: ['19:00'] }),
      });
    });

    await page.goto(`${BASE}/restaurant/${RESTAURANT_ID}`, { waitUntil: 'domcontentloaded' });

    const waitlistLink = page.getByRole('link', { name: 'restaurant-waitlist' });
    await expect(waitlistLink).toBeVisible();
    await expect(waitlistLink).toContainText(/Войти и встать в лист ожидания|Встать в лист ожидания/);

    await waitlistLink.click();
    await expect(page).toHaveURL(new RegExp(`/restaurant/${RESTAURANT_ID}/book\\?date=`));
    await expect(page.getByRole('button', { name: 'booking-submit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'booking-waitlist' })).toBeVisible();
  });
});

function getAlmatyDate(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(date);
}
