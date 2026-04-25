from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from restaurants.models import Restaurant, Table
from bookings.models import Booking

class PeakCapacityTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pwd")
        self.admin.profile.role = "restaurant_admin"
        self.admin.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Capacity Restaurant",
            owner=self.admin,
            is_claimed=True,
            is_verified=True,
            capacity=10,
        )
                                                                                     
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=4)
        Table.objects.create(restaurant=self.restaurant, number="T2", seats=4)
        Table.objects.create(restaurant=self.restaurant, number="T3", seats=4)

    def _login(self, username: str, password: str) -> str:
        res = self.client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")
        return res.data["access"]

    def test_global_capacity_respected(self):
        
        user1 = User.objects.create_user(username="user1", password="pwd")
        user2 = User.objects.create_user(username="user2", password="pwd")
        user3 = User.objects.create_user(username="user3", password="pwd")
        
                                            
        token1 = self._login("user1", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "18:00:00",
            "guests": 4
        }, format="json")
        
                                                               
        token2 = self._login("user2", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token2}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "18:30:00",
            "guests": 4
        }, format="json")
        
                                                             
        
                                             
                                                              
                                                                           
        token3 = self._login("user3", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token3}")
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "19:00:00",
            "guests": 4
        }, format="json")
        
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Превышена вместимость", res.data["detail"])

    def test_manual_booking_respects_capacity(self):
        
        token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
                                                              
                                                                                                    
        user_a = User.objects.create_user(username="cap_user_a", password="pwd")
        user_b = User.objects.create_user(username="cap_user_b", password="pwd")

        token_a = self._login("cap_user_a", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")
        res_a = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-11-02",
                "time": "18:00:00",
                "guests": 4,
            },
            format="json",
        )
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)

        token_b = self._login("cap_user_b", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")
        res_b = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-11-02",
                "time": "18:00:00",
                "guests": 4,
            },
            format="json",
        )
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)

                                                  
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
                                                             
        res = self.client.post("/api/v1/bookings/create_manual/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-02",
            "time": "18:15:00",
            "guests": 4,
            "user_name_manual": "Manual Guest"
        }, format="json")
        
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Превышена вместимость", res.data["detail"])
