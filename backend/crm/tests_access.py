from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from crm.models import Customer, CustomerNote
from restaurants.models import Restaurant


class CrmAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="crm_owner", password="pwd-123")
        self.owner.profile.role = "restaurant_owner"
        self.owner.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="CRM Access Restaurant",
            address="CRM access street",
            latitude=43.2,
            longitude=76.9,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
        )

        self.staff = User.objects.create_user(username="crm_staff", password="pwd-123")
        self.staff.profile.role = "manager"
        self.staff.profile.restaurant = self.restaurant
        self.staff.profile.save()

        self.host = User.objects.create_user(username="crm_host", password="pwd-123")
        self.host.profile.role = "host"
        self.host.profile.restaurant = self.restaurant
        self.host.profile.save()

        self.other = User.objects.create_user(username="crm_other", password="pwd-123")
        self.other.profile.role = "customer"
        self.other.profile.save()

        self.customer = Customer.objects.create(
            restaurant=self.restaurant,
            name="CRM Guest",
            phone="+77010000001",
            email="crm_guest@test.local",
        )
        CustomerNote.objects.create(
            customer=self.customer,
            author=self.owner,
            content="Prefers window table",
        )

    def test_owner_can_access_customers_via_owned_restaurant(self):
        self.client.force_authenticate(self.owner)
        res = self.client.get("/api/v1/crm/customers/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "CRM Guest")

    def test_staff_can_access_customers_and_notes_via_profile_restaurant(self):
        self.client.force_authenticate(self.staff)
        customers_res = self.client.get("/api/v1/crm/customers/")
        notes_res = self.client.get("/api/v1/crm/notes/")
        self.assertEqual(customers_res.status_code, status.HTTP_200_OK)
        self.assertEqual(notes_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(customers_res.data), 1)
        self.assertEqual(len(notes_res.data), 1)

    def test_unrelated_user_cannot_access_restaurant_customers(self):
        self.client.force_authenticate(self.other)
        customers_res = self.client.get("/api/v1/crm/customers/")
        notes_res = self.client.get("/api/v1/crm/notes/")
        self.assertEqual(customers_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(notes_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_host_cannot_access_crm_customer_lists(self):
        self.client.force_authenticate(self.host)
        customers_res = self.client.get("/api/v1/crm/customers/")
        notes_res = self.client.get("/api/v1/crm/notes/")
        visits_res = self.client.get("/api/v1/crm/visits/")
        self.assertEqual(customers_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(notes_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(visits_res.status_code, status.HTTP_403_FORBIDDEN)
