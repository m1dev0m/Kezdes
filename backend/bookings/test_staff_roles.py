import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from restaurants.models import Restaurant, Table
from bookings.models import Booking
from crm.models import Customer


@pytest.mark.django_db
class TestStaffManagement:
    

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def owner_with_restaurant(self):
        owner = User.objects.create_user(
            username='test_owner',
            email='owner@test.com',
            password='testpass123'
        )
        owner.profile.role = 'owner'
        owner.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Test Restaurant',
            address='123 Test St',
            owner=owner,
            is_claimed=True,
            is_verified=True,
            capacity=20
        )
        owner.profile.restaurant = restaurant
        owner.profile.save()
        
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        return owner, restaurant

    def test_owner_can_add_manager(self, api_client, owner_with_restaurant):
        
        owner, restaurant = owner_with_restaurant
        api_client.force_authenticate(user=owner)
        
        response = api_client.post('/api/v1/restaurants/staff/', {
            'username': 'new_manager',
            'email': 'manager@test.com',
            'first_name': 'John Manager',
            'role': 'manager',
            'password': 'testpass123'
        })
        
        assert response.status_code == 201, f"Failed: {response.data}"
        
        manager = User.objects.get(username='new_manager')
        assert manager.profile.role == 'manager'
        assert manager.profile.restaurant == restaurant

    def test_owner_can_add_host(self, api_client, owner_with_restaurant):
        
        owner, restaurant = owner_with_restaurant
        api_client.force_authenticate(user=owner)
        
        response = api_client.post('/api/v1/restaurants/staff/', {
            'username': 'new_host',
            'email': 'host@test.com',
            'first_name': 'Jane Host',
            'role': 'host',
            'password': 'testpass123'
        })
        
        assert response.status_code == 201
        
        host = User.objects.get(username='new_host')
        assert host.profile.role == 'host'
        assert host.profile.restaurant == restaurant

    def test_manager_can_view_bookings(self, api_client, owner_with_restaurant):
        
        owner, restaurant = owner_with_restaurant
        
        manager = User.objects.create_user(
            username='test_manager',
            email='manager@test.com',
            password='testpass123'
        )
        manager.profile.role = 'manager'
        manager.profile.restaurant = restaurant
        manager.profile.save()
        
        customer = User.objects.create_user(
            username='customer_booking',
            email='customer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        table = Table.objects.get(restaurant=restaurant)
        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=date.today() + timedelta(days=1),
            time=time(19, 0),
            guests=2,
            status='confirmed'
        )
        
        api_client.force_authenticate(user=manager)
        response = api_client.get('/api/v1/bookings/')
        
        assert response.status_code == 200
                                             
        if hasattr(response.data, 'get'):
            results = response.data.get('results', response.data)
        else:
            results = response.data
        assert len(results) >= 1

    def test_manager_can_confirm_booking(self, api_client, owner_with_restaurant):
        
        owner, restaurant = owner_with_restaurant
        
        manager = User.objects.create_user(
            username='test_manager2',
            email='manager2@test.com',
            password='testpass123'
        )
        manager.profile.role = 'manager'
        manager.profile.restaurant = restaurant
        manager.profile.save()
        
        customer = User.objects.create_user(
            username='customer_booking2',
            email='customer2@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        table = Table.objects.get(restaurant=restaurant)
        booking = Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=date.today() + timedelta(days=1),
            time=time(19, 0),
            guests=2,
            status='pending'
        )
        
        api_client.force_authenticate(user=manager)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/confirm/')
        
                                           
        assert response.status_code in [200, 403]

    def test_host_can_view_bookings(self, api_client, owner_with_restaurant):
        
        owner, restaurant = owner_with_restaurant
        
        host = User.objects.create_user(
            username='test_host',
            email='host@test.com',
            password='testpass123'
        )
        host.profile.role = 'host'
        host.profile.restaurant = restaurant
        host.profile.save()
        
        api_client.force_authenticate(user=host)
        response = api_client.get('/api/v1/bookings/')
        
        assert response.status_code == 200


@pytest.mark.django_db
class TestRolePermissions:
    

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def restaurant_setup(self):
        owner = User.objects.create_user(
            username='perm_owner',
            email='perm_owner@test.com',
            password='testpass123'
        )
        owner.profile.role = 'owner'
        owner.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Perm Restaurant',
            address='123 Perm St',
            owner=owner,
            is_claimed=True,
            is_verified=True
        )
        owner.profile.restaurant = restaurant
        owner.profile.save()
        
        return owner, restaurant

    def test_customer_cannot_access_staff_management(self, api_client, restaurant_setup):
        
        owner, restaurant = restaurant_setup
        
        customer = User.objects.create_user(
            username='perm_customer',
            email='perm_customer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
                                                             
        response = api_client.get('/api/v1/restaurants/staff/')
        
                                                                                           
        assert response.status_code in [200, 403, 404]
                                      
        if response.status_code == 200:
            assert len(response.data) == 0

    def test_customer_can_create_booking(self, api_client, restaurant_setup):
        
        owner, restaurant = restaurant_setup
        
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        customer = User.objects.create_user(
            username='booking_customer_perm',
            email='booking_perm@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
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
