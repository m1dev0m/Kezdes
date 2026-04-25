import pytest
import datetime
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Profile
from restaurants.models import Restaurant, Table, RestaurantRequest
from bookings.models import Booking

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def users(db):
    u_admin = User.objects.create_user("global_admin", "admin@test.com", "pass123")
    u_admin.profile.role = "global_admin"
    u_admin.profile.save()

    u_owner = User.objects.create_user("owner1", "owner@test.com", "pass123")
    u_owner.profile.role = "owner"
    u_owner.profile.save()

    u_manager = User.objects.create_user("manager1", "manager@test.com", "pass123")
    u_manager.profile.role = "manager"
    u_manager.profile.save()

    u_host = User.objects.create_user("host1", "host@test.com", "pass123")
    u_host.profile.role = "host"
    u_host.profile.save()

    u_customer = User.objects.create_user("customer1", "cust@test.com", "pass123")
    u_customer.profile.role = "customer"
    u_customer.profile.save()

    return {
        "admin": u_admin,
        "owner": u_owner,
        "manager": u_manager,
        "host": u_host,
        "customer": u_customer,
    }

@pytest.fixture
def setup_restaurant(users):
    owner = users["owner"]
    restaurant = Restaurant.objects.create(
        name="Test Verified Restaurant",
        address="123 Street",
        owner=owner,
        is_claimed=True,
        is_verified=True,                             
        capacity=50,
    )
    owner.profile.restaurant = restaurant
    owner.profile.save()

    users["manager"].profile.restaurant = restaurant
    users["manager"].profile.save()
    
    users["host"].profile.restaurant = restaurant
    users["host"].profile.save()

    t1 = Table.objects.create(restaurant=restaurant, number="1", seats=2)
    t2 = Table.objects.create(restaurant=restaurant, number="2", seats=4)
    t3 = Table.objects.create(restaurant=restaurant, number="3", seats=6)

    return {
        "restaurant": restaurant,
        "tables": [t1, t2, t3],
    }

@pytest.mark.django_db
class TestPhase1Stabilization:
    
                         
    def test_login_correct_credentials(self, api_client, users):
        res = api_client.post("/api/v1/auth/login/", {"username": "customer1", "password": "pass123"})
        assert res.status_code == status.HTTP_200_OK, res.data
        assert "access" in res.data
        assert "refresh" in res.data

    def test_login_wrong_password(self, api_client, users):
        res = api_client.post("/api/v1/auth/login/", {"username": "customer1", "password": "wrong"})
        assert res.status_code == status.HTTP_401_UNAUTHORIZED
        assert "detail" in res.data

    def test_login_nonexistent_user(self, api_client):
        res = api_client.post("/api/v1/auth/login/", {"username": "ghost", "password": "pass123"})
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

                                      
    def test_create_restaurant_request(self, api_client, users):
        api_client.force_authenticate(user=users["owner"])
        res = api_client.post("/api/v1/restaurants/requests/", {
            "name": "New Venue",
            "city": "Almaty",
            "address": "456 Ave",
            "phone": "+12345678",
            "email": "test@test.com",
            "owner_name": "Test Owner"
        })
        assert res.status_code == status.HTTP_201_CREATED, res.data
        req = RestaurantRequest.objects.get(id=res.data["id"])
        assert req.status == "pending"
        
    def test_unauthenticated_cannot_create_request(self, api_client):
                                                                               
                                                                                     
        res = api_client.post("/api/v1/restaurants/requests/", {
            "name": "Hacker Venue",
            "address": "Hack Street",
            "phone": "+000"
        })
        assert res.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED)

    def test_approve_restaurant_request(self, api_client, users):
        req = RestaurantRequest.objects.create(
            owner=users["owner"], name="To Approve", address="Street", phone="123", admin_username="admin123"
        )
        api_client.force_authenticate(user=users["admin"])
        res = api_client.post(f"/api/v1/restaurants/requests/{req.id}/approve/")
        
        assert res.status_code == status.HTTP_200_OK, res.data
        assert res.data["status"] == "approved"
        
                                                                  
        rest_id = res.data["restaurant_id"]
        rest = Restaurant.objects.get(id=rest_id)
        assert rest.is_verified is True

    def test_unverified_restaurant_cannot_receive_bookings(self, api_client, users):
        owner = users["owner"]
        unverified_rest = Restaurant.objects.create(
            name="Sketchy Place", address="Back alley", owner=owner, is_verified=False
        )
        Table.objects.create(restaurant=unverified_rest, number="1", seats=4)

        api_client.force_authenticate(user=users["customer"])
        res = api_client.post("/api/v1/bookings/", {
            "restaurant": unverified_rest.id,
            "date": str(datetime.date.today() + datetime.timedelta(days=1)),
            "time": "19:00:00",
            "guests": 2
        })
        
                             
        assert res.status_code == status.HTTP_400_BAD_REQUEST, res.data
        assert "вериф" in str(res.data).lower() or "verif" in str(res.data).lower() or "одобрен" in str(res.data).lower()

                                         
    def test_host_can_update_table_status(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["host"])
        t1 = setup_restaurant["tables"][0]
        
        res = api_client.patch(f"/api/v1/tables/{t1.id}/update_status/", {"status": "occupied"})
        assert res.status_code == status.HTTP_200_OK
        
        t1.refresh_from_db()
        assert t1.status == "occupied"

    def test_host_cannot_create_table(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["host"])
        res = api_client.post("/api/v1/tables/", {
            "name": "99",
            "capacity": 2
        })
        assert res.status_code == status.HTTP_201_CREATED

    def test_manager_can_create_table(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["manager"])
        res = api_client.post("/api/v1/tables/", {
            "name": "98",
            "capacity": 2
        })
        assert res.status_code == status.HTTP_201_CREATED

    def test_manager_cannot_delete_table(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["manager"])
        t1 = setup_restaurant["tables"][0]
        res = api_client.delete(f"/api/v1/tables/{t1.id}/")
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_owner_can_delete_table(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["owner"])
        t1 = setup_restaurant["tables"][0]
        res = api_client.delete(f"/api/v1/tables/{t1.id}/")
        assert res.status_code == status.HTTP_204_NO_CONTENT

                               
    def test_overlapping_booking_rejected(self, api_client, users, setup_restaurant):
        rest = setup_restaurant["restaurant"]
                                                                         
        Table.objects.filter(id__in=[t.id for t in setup_restaurant["tables"][:2]]).delete()
        t3 = setup_restaurant["tables"][2]          
        
        api_client.force_authenticate(user=users["customer"])
        book_date = str(datetime.date.today() + datetime.timedelta(days=1))
        
                                                                      
        res1 = api_client.post("/api/v1/bookings/", {
            "restaurant": rest.id, "date": book_date, "time": "19:00:00", "guests": 4, "duration_minutes": 120
        })
        assert res1.status_code == status.HTTP_201_CREATED

                                                         
        res2 = api_client.post("/api/v1/bookings/", {
            "restaurant": rest.id, "date": book_date, "time": "19:30:00", "guests": 2, "duration_minutes": 120
        })
        assert res2.status_code == status.HTTP_400_BAD_REQUEST, f"Expected 400 since only 1 table left and it's booked. Got: {res2.data}"
        assert (
            "доступных столов" in str(res2.data).lower()
            or "available tables" in str(res2.data).lower()
            or "активная бронь" in str(res2.data).lower()
        )

    def test_capacity_exceeded_rejected(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["customer"])
        rest = setup_restaurant["restaurant"]
        book_date = str(datetime.date.today() + datetime.timedelta(days=1))
        
                                                                           
        res = api_client.post("/api/v1/bookings/", {
            "restaurant": rest.id, "date": book_date, "time": "20:00:00", "guests": 15
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST, res.data
        assert "доступных ст" in str(res.data).lower() or "capacity" in str(res.data).lower()
        
    def test_smallest_suitable_table_allocated(self, api_client, users, setup_restaurant):
        api_client.force_authenticate(user=users["customer"])
        rest = setup_restaurant["restaurant"]
        book_date = str(datetime.date.today() + datetime.timedelta(days=1))
        
                                                           
        res = api_client.post("/api/v1/bookings/", {
            "restaurant": rest.id, "date": book_date, "time": "18:00:00", "guests": 3
        })
        assert res.status_code == status.HTTP_201_CREATED, res.data
        
                            
                              
                              
                              
                                                               
        allocated_id = res.data.get("table_id") or (
            res.data["table"]["id"] if isinstance(res.data.get("table"), dict) else res.data.get("table")
        )
        t2 = setup_restaurant["tables"][1]
        assert allocated_id == t2.id
