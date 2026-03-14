from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from core.models import Profile
from restaurants.models import Restaurant, Table
from bookings.models import Booking
class CriticalFlowsTestCase(APITestCase):
    def setUp(self):
        pass
    def test_a_registration_and_login(self):
        data = {
            "username": "rest_admin_1",
            "email": "admin1@test.com",
            "password": "password123",
            "role": "restaurant_admin"
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, "Restaurant admin registration should succeed")
        user = User.objects.get(username="rest_admin_1")
        self.assertEqual(user.profile.role, "owner", "Role should be owner (restaurant owner)")
        login_data = {
            "username": "admin1@test.com", 
            "password": "password123"
        }
        response = self.client.post(reverse('token_obtain_pair'), login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, "Restaurant admin should be able to login")
        self.assertIn('access', response.data)
        data_dup = {
            "username": "rest_admin_2",
            "email": "admin1@test.com",
            "password": "password123",
            "role": "restaurant_admin"
        }
        response = self.client.post(reverse('register'), data_dup)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, "Should not be able to register with same email")
        data_org = {
            "username": "org_1",
            "email": "org1@test.com",
            "password": "password123",
            "role": "organizer"
        }
        response = self.client.post(reverse('register'), data_org)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, "Organizer registration should succeed")
        org_login = self.client.post(reverse('token_obtain_pair'), {"username": "org1@test.com", "password": "password123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + org_login.data['access'])
        response = self.client.post('/api/v1/restaurants/', {"name": "Test Rest", "latitude": 0, "longitude": 0})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, "Organizer should not access admin endpoints")
    def test_b_restaurant_creation(self):
        self.client.post(reverse('register'), {
            "username": "admin_rest2", "password": "123", "role": "restaurant_admin"
        })
        login_res = self.client.post(reverse('token_obtain_pair'), {"username": "admin_rest2", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])
        rest_data = {
            "name": "My Restaurant",
            "address": "123 Test St",
            "latitude": 43.0,
            "longitude": 76.0,
            "capacity": 50,
            "average_price": 5000
        }
        response = self.client.post('/api/v1/restaurants/', rest_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, "Restaurant admin should be able to create restaurant")
        rest_id = response.data['id']
        rest = Restaurant.objects.get(id=rest_id)
        self.assertEqual(rest.owner.username, "admin_rest2")
        response2 = self.client.post('/api/v1/restaurants/', rest_data)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST, "Should not be able to create a second restaurant")
        rest_data_hack = rest_data.copy()
        rest_data_hack['name'] = "Hack"
        user1 = User.objects.create(username="hacker")
        rest_data_hack['owner'] = user1.id
        response3 = self.client.post('/api/v1/restaurants/', rest_data) 
        self.client.credentials() 
        self.client.post(reverse('register'), {"username": "admin_rest3", "password": "123", "role": "restaurant_admin"})
        login_res3 = self.client.post(reverse('token_obtain_pair'), {"username": "admin_rest3", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res3.data['access'])
        response4 = self.client.post('/api/v1/restaurants/', rest_data_hack)
        self.assertEqual(response4.status_code, status.HTTP_201_CREATED)
        rest4 = Restaurant.objects.get(id=response4.data['id'])
        self.assertNotEqual(rest4.owner.id, user1.id, "Owner field input should be ignored")
        self.assertEqual(rest4.owner.username, "admin_rest3", "Owner should strictly be request.user")
    def test_c_restaurant_visibility(self):
        u1 = User.objects.create_user(username="u1", password="123")
        u1.profile.role = "restaurant_admin"
        u1.profile.save()
        r1 = Restaurant.objects.create(name="R1", latitude=0, longitude=0, owner=u1, is_claimed=True)
        u2 = User.objects.create_user(username="u2", password="123")
        u2.profile.role = "restaurant_admin"
        u2.profile.save()
        r2 = Restaurant.objects.create(name="R2", latitude=0, longitude=0, owner=u2, is_claimed=True)
        org = User.objects.create_user(username="org_vis", password="123")
        org.profile.role = "organizer"
        org.profile.save()
        login_res = self.client.post(reverse('token_obtain_pair'), {"username": "org_vis", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])
        response = self.client.get('/api/v1/restaurants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [r['name'] for r in response.data]  
        if 'results' in response.data:
            names = [r['name'] for r in response.data['results']]
        self.assertIn("R1", names)
        self.assertIn("R2", names)
        login_res1 = self.client.post(reverse('token_obtain_pair'), {"username": "u1", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res1.data['access'])
        response_u1 = self.client.get('/api/v1/restaurants/?my_restaurants=true')
        names_u1 = [r['name'] for r in response_u1.data] if isinstance(response_u1.data, list) else [r['name'] for r in response_u1.data['results']]
        self.assertIn("R1", names_u1)
        self.assertNotIn("R2", names_u1, "Restaurant admin should only see their own restaurant when my_restaurants=true")
    def test_d_booking_lifecycle_and_e_security(self):
        self.client.post(reverse('register'), {"username": "org_book", "password": "123", "role": "organizer"})
        self.client.post(reverse('register'), {"username": "admin_bk1", "password": "123", "role": "restaurant_admin"})
        self.client.post(reverse('register'), {"username": "admin_bk2", "password": "123", "role": "restaurant_admin"})
        admin1 = User.objects.get(username="admin_bk1")
        r1 = Restaurant.objects.create(name="R1", latitude=0, longitude=0, owner=admin1, is_claimed=True, is_verified=True)
        Table.objects.create(restaurant=r1, number="T1", seats=4, is_active=True)
        admin2 = User.objects.get(username="admin_bk2")
        r2 = Restaurant.objects.create(name="R2", latitude=0, longitude=0, owner=admin2, is_claimed=True, is_verified=True)
        Table.objects.create(restaurant=r2, number="T1", seats=4, is_active=True)
        login_org = self.client.post(reverse('token_obtain_pair'), {"username": "org_book", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_org.data['access'])
        b_data = {
            "restaurant": r1.id,
            "date": "2030-01-01",
            "time": "19:00",
            "guests": 2
        }
        res_book = self.client.post('/api/v1/bookings/', b_data)
        self.assertEqual(res_book.status_code, status.HTTP_201_CREATED)
        b_id = res_book.data['id']
        self.assertEqual(res_book.data['status'], 'pending')
        res_my_rest = self.client.get('/api/v1/bookings/my_restaurant/')
        self.assertEqual(res_my_rest.status_code, status.HTTP_403_FORBIDDEN, "Organizer should not access my_restaurant endpoint")
        login_a1 = self.client.post(reverse('token_obtain_pair'), {"username": "admin_bk1", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_a1.data['access'])
        res_a1_bookings = self.client.get('/api/v1/bookings/my_restaurant/')
        self.assertEqual(res_a1_bookings.status_code, status.HTTP_200_OK)
        b_ids = [b['id'] for b in res_a1_bookings.data] if isinstance(res_a1_bookings.data, list) else [b['id'] for b in res_a1_bookings.data.get('results', [])]
        self.assertIn(b_id, b_ids)
        login_a2 = self.client.post(reverse('token_obtain_pair'), {"username": "admin_bk2", "password": "123"})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_a2.data['access'])
        res_a2_confirm = self.client.post(f'/api/v1/bookings/{b_id}/confirm/')
        self.assertIn(res_a2_confirm.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND], "Admin 2 should not confirm Admin 1's booking")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_a1.data['access'])
        res_a1_confirm = self.client.post(f'/api/v1/bookings/{b_id}/confirm/')
        self.assertEqual(res_a1_confirm.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_org.data['access'])
        res_org_check = self.client.get(f'/api/v1/bookings/{b_id}/')
        self.assertEqual(res_org_check.data['status'], 'confirmed')
