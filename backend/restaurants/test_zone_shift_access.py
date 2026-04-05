from datetime import time

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from restaurants.models import Restaurant, Zone, Shift


class ZoneShiftAccessTests(APITestCase):
    def setUp(self):
        self.owner1 = User.objects.create_user("zone_owner1", "zone_owner1@test.local", "pass1234")
        self.owner2 = User.objects.create_user("zone_owner2", "zone_owner2@test.local", "pass1234")
        self.customer = User.objects.create_user("zone_customer", "zone_customer@test.local", "pass1234")

        self.restaurant1 = Restaurant.objects.create(
            name="Zone R1",
            address="Addr 1",
            city="City",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            owner=self.owner1,
            phone="+77001110001",
        )
        self.restaurant2 = Restaurant.objects.create(
            name="Zone R2",
            address="Addr 2",
            city="City",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            owner=self.owner2,
            phone="+77001110002",
        )

        self.zone2 = Zone.objects.create(restaurant=self.restaurant2, name="VIP")
        self.shift2 = Shift.objects.create(
            restaurant=self.restaurant2,
            name="Evening",
            starts_at=time(18, 0),
            ends_at=time(23, 0),
            days_of_week=[1, 2, 3, 4, 5],
        )

    def test_customer_cannot_read_foreign_zones(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f"/api/v1/restaurants/zones/?restaurant_id={self.restaurant2.id}")
        self.assertEqual(res.status_code, 200)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertEqual(len(data), 0)

    def test_customer_cannot_read_foreign_shifts(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f"/api/v1/restaurants/shifts/?restaurant_id={self.restaurant2.id}")
        self.assertEqual(res.status_code, 200)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertEqual(len(data), 0)
