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
        
        self.customer = User.objects.create_user(username="customer1", password="pwd")

    def _get_token(self, username, password="pwd"):
        res = self.client.post("/api/v1/auth/login/", {"username": username, "password": password})
        return res.data["access"]

    def test_overlap_forbidden(self):
                token = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:00:00",
            "guests": 2
        })
        assert res.status_code == status.HTTP_201_CREATED
        
        res2 = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:30:00",
            "guests": 2
        })
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_back_to_back_allowed(self):
                token = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "18:00:00",
            "guests": 2
        })
        
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-01",
            "time": "19:30:00",
            "guests": 2
        })
        assert res.status_code == status.HTTP_201_CREATED

    def test_capacity_exceeded(self):
        token1 = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-02",
            "time": "18:00:00",
            "guests": 6
        })
        
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
        token1 = self._get_token("owner1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        
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
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        
        res = self.client.get(f"/api/v1/bookings/{b2_id}/")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_flow_status_changes(self):
                token_cust = self._get_token("customer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_cust}")
        
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant1.id,
            "date": "2030-01-04",
            "time": "18:00:00",
            "guests": 2
        })
        b_id = res.data["id"]
        assert res.data["status"] == "pending"
        
        token_owner = self._get_token("owner1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_owner}")
        
        res = self.client.post(f"/api/v1/bookings/{b_id}/confirm/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "confirmed"
        
        res = self.client.post(f"/api/v1/bookings/{b_id}/seat/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "seated"
        
        res = self.client.post(f"/api/v1/bookings/{b_id}/complete/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "completed"
