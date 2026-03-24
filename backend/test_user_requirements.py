import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from restaurants.models import Restaurant, Table
from bookings.models import Booking

@pytest.mark.django_db
class TestUserRequirements:
    @pytest.fixture(autouse=True)
    def setup_method(self, db):
        self.client = APIClient()
        
        # Create Owner 1 and Restaurant 1
        self.owner1 = User.objects.create_user(username="owner1", password="pwd")
        self.owner1.profile.role = "owner"
        self.owner1.profile.save()
        
        self.restaurant1 = Restaurant.objects.create(
            name="Restaurant 1",
            owner=self.owner1,
            is_claimed=True,
            is_verified=True,
            capacity=10
        )
        self.owner1.profile.restaurant = self.restaurant1
        self.owner1.profile.save()
        
        Table.objects.create(restaurant=self.restaurant1, number="R1T1", seats=10)
        
        # Create Owner 2 and Restaurant 2
        self.owner2 = User.objects.create_user(username="owner2", password="pwd")
        self.owner2.profile.role = "owner"
        self.owner2.profile.save()
        
        self.restaurant2 = Restaurant.objects.create(
            name="Restaurant 2",
            owner=self.owner2,
            is_claimed=True,
            is_verified=True,
            capacity=10
        )
        self.owner2.profile.restaurant = self.restaurant2
        self.owner2.profile.save()
        
        Table.objects.create(restaurant=self.restaurant2, number="R2T1", seats=10)
        
        # Create a customer
        self.customer = User.objects.create_user(username="customer1", password="pwd")

    def _get_token(self, username, password="pwd"):
        res = self.client.post("/api/v1/auth/login/", {"username": username, "password": password})
        return res.data["access"]

    def test_overlap_forbidden(self):
        """1. Overlap → 400"""
        token = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Booking A: 18:00 - 19:30 (90 min)
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:00:00",
            "guests": 2
        })
        assert res.status_code == status.HTTP_201_CREATED
        
        # Booking B: 18:30 - 20:00 (overlaps with A)
        res2 = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:30:00",
            "guests": 2
        })
        # Since we only have one table of 10, and it's occupied by Booking A, Booking B should fail if it needs that table.
        # find_best_tables will find it's occupied.
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_back_to_back_allowed(self):
        """2. Бронь впритык → разрешить"""
        token = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Booking A: 18:00 - 19:30
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:00:00",
            "guests": 2
        })
        
        # Booking B starts exactly when A ends: 19:30
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "19:30:00",
            "guests": 2
        })
        assert res.status_code == status.HTTP_201_CREATED

    def test_capacity_exceeded(self):
        """3. Превышение вместимости → 400"""
        # Global capacity is 10.
        # Booking A: 6 guests (Customer 1)
        token1 = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-02",
            "time": "18:00:00",
            "guests": 6
        })
        
        # Booking B: 5 guests (Total 11 > 10) (Customer 2)
        User.objects.create_user(username="customer2", password="pwd")
        token2 = self._get_token("customer2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token2}")
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-02",
            "time": "18:00:00",
            "guests": 5
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "вместимость" in res.data["detail"].lower()

    def test_tenant_isolation_403(self):
        """4. Чужой ресторан → 403 (or just not shown in results)"""
        # Login as owner1
        token1 = self._get_token("owner1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        
        # Create a booking in restaurant 2
        User.objects.create_user(username="customer3", password="pwd")
        token_cust = self._get_token("customer3")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_cust}")
        res_b2 = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant2.id,
            "date": "2030-01-03",
            "time": "18:00:00",
            "guests": 2
        })
        b2_id = res_b2.data["id"]
        
        # Back to owner1
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        
        # Try to retrieve booking of restaurant 2
        res = self.client.get(f"/api/v1/bookings/{b2_id}/")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_flow_status_changes(self):
        """5. Flow: create→confirm→seat→complete"""
        token_cust = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_cust}")
        
        # 1. Create (Pending)
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-04",
            "time": "18:00:00",
            "guests": 2
        })
        b_id = res.data["id"]
        assert res.data["status"] == "pending"
        
        # Login as owner1 to manage
        token_owner = self._get_token("owner1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_owner}")
        
        # 2. Confirm (Confirmed)
        res = self.client.post(f"/api/v1/bookings/{b_id}/confirm/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "confirmed"
        
        # 3. Seat (Seated)
        res = self.client.post(f"/api/v1/bookings/{b_id}/seat/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "seated"
        
        # 4. Complete (Completed)
        res = self.client.post(f"/api/v1/bookings/{b_id}/complete/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "completed"
