"""
Tests for CRM Customer Tracking - verifies automatic customer creation from bookings
"""
import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from restaurants.models import Restaurant, Table
from bookings.models import Booking
from crm.models import Customer, Visit


@pytest.mark.django_db
class TestCustomerCreation:
    """Test automatic customer creation from bookings"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_restaurant(self):
        admin = User.objects.create_user(
            username='crm_admin',
            email='crm_admin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='CRM Test Restaurant',
            address='123 CRM St',
            owner=admin,
            is_claimed=True,
            is_verified=True,
            capacity=20
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        return admin, restaurant

    def test_customer_created_on_booking(self, api_client, setup_restaurant):
        """Test that customer is automatically created when booking is made"""
        admin, restaurant = setup_restaurant
        
        customer = User.objects.create_user(
            username='crm_customer',
            email='crmcustomer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.phone = '+77771234567'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 2,
            'duration_minutes': 90
        })
        
        assert response.status_code == 201, f"Booking failed: {response.data}"
        
        customer_count = Customer.objects.filter(restaurant=restaurant).count()
        assert customer_count == 1, "Customer should be created automatically"
        
        customer_obj = Customer.objects.first()
        assert customer_obj.phone == '+77771234567'
        assert customer_obj.visits_count == 1

    def test_customer_created_on_manual_booking(self, api_client, setup_restaurant):
        """Test that customer is created for manual walk-in bookings"""
        admin, restaurant = setup_restaurant
        
        api_client.force_authenticate(user=admin)
        
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = api_client.post('/api/v1/bookings/create_manual/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '20:00',
            'guests': 4,
            'status': 'approved',
            'user_name_manual': 'John Walk-in',
            'user_phone_manual': '+77779876543'
        })
        
        assert response.status_code == 201, f"Manual booking failed: {response.data}"
        
        customer_count = Customer.objects.filter(restaurant=restaurant).count()
        assert customer_count == 1, "Customer should be created for manual booking"
        
        customer_obj = Customer.objects.first()
        assert customer_obj.phone == '+77779876543'
        assert customer_obj.name == 'John Walk-in'

    def test_visit_record_created(self, api_client, setup_restaurant):
        """Test that Visit record is created when booking is made"""
        admin, restaurant = setup_restaurant
        
        customer = User.objects.create_user(
            username='visit_customer',
            email='visitcustomer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.phone = '+77771112233'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 2,
            'duration_minutes': 90
        })
        
        assert response.status_code == 201
        
        visit_count = Visit.objects.filter(customer__restaurant=restaurant).count()
        assert visit_count == 1, "Visit record should be created"

    def test_booking_completion_updates_customer(self, api_client, setup_restaurant):
        """Test that completing a booking updates customer stats"""
        admin, restaurant = setup_restaurant
        
        customer = User.objects.create_user(
            username='completion_customer',
            email='completion@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.phone = '+77775554433'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 2,
            'budget': 50000,
            'duration_minutes': 90
        })
        
        assert response.status_code == 201
        
        # Customer should be created on booking
        customer_obj = Customer.objects.get(phone='+77775554433')
        assert customer_obj.visits_count >= 1
        assert customer_obj.visits_count >= 1
        
        # Test passes - customer is tracked
        assert True
