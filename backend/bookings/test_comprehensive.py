"""
Comprehensive tests for MVP Restaurant Reservation Platform
Tests critical features: Authentication, Restaurant Creation, Table Management,
Reservation Creation, Reservation Conflict Prevention
"""
import pytest
from datetime import date, time, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from restaurants.models import Restaurant, Table, OpeningHours
from bookings.models import Booking


class TestAuthentication:
    """Tests for user authentication"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def customer_user(self, db):
        user = User.objects.create_user(
            username='customer_test',
            email='customer@test.com',
            password='testpass123'
        )
        user.profile.role = 'customer'
        user.profile.save()
        return user

    def test_registration_as_customer(self, api_client, db):
        """Test that a user can register as a customer"""
        response = api_client.post('/api/v1/auth/register/', {
            'username': 'new_customer',
            'email': 'newcustomer@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'customer',
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username='new_customer').exists()

    def test_registration_as_restaurant_admin(self, api_client, db):
        """Test that a user can register as a restaurant admin (mapped to owner)"""
        response = api_client.post('/api/v1/auth/register/', {
            'username': 'new_restaurant_admin',
            'email': 'newadmin@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'restaurant_admin',
        })
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username='new_restaurant_admin')
        # Role is mapped from restaurant_admin to owner
        assert user.profile.role == 'owner'

    def test_login_success(self, api_client, customer_user):
        """Test successful login"""
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'customer_test',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_credentials(self, api_client, customer_user):
        """Test login with invalid credentials fails"""
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'customer_test',
            'password': 'wrongpassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRestaurantCreation:
    """Tests for restaurant creation"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def restaurant_admin(self, db):
        user = User.objects.create_user(
            username='rest_admin_for_creation',
            email='restadmin@test.com',
            password='testpass123'
        )
        user.profile.role = 'restaurant_admin'
        user.profile.save()
        return user

    def test_create_restaurant(self, api_client, restaurant_admin):
        """Test that a restaurant admin can create a restaurant"""
        api_client.force_authenticate(user=restaurant_admin)
        
        response = api_client.post('/api/v1/restaurants/', {
            'name': 'Test Restaurant',
            'address': '123 Test St',
            'city': 'Almaty',
            'latitude': 43.238949,
            'longitude': 76.889709,
            'capacity': 50,
            'average_price': 5000
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Restaurant'
        
        restaurant = Restaurant.objects.get(name='Test Restaurant')
        assert restaurant.owner == restaurant_admin

    def test_cannot_create_second_restaurant(self, api_client, restaurant_admin, db):
        """Test that a restaurant admin cannot create a second restaurant"""
        # First restaurant
        Restaurant.objects.create(
            name='First Restaurant',
            address='123 Test St',
            owner=restaurant_admin,
            is_claimed=True
        )
        
        api_client.force_authenticate(user=restaurant_admin)
        
        response = api_client.post('/api/v1/restaurants/', {
            'name': 'Second Restaurant',
            'address': '456 Test St',
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTableManagement:
    """Tests for table management"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def restaurant_with_admin(self, db):
        user = User.objects.create_user(
            username='table_admin',
            email='tableadmin@test.com',
            password='testpass123'
        )
        user.profile.role = 'restaurant_admin'
        user.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Table Test Restaurant',
            address='123 Test St',
            owner=user,
            is_claimed=True,
            is_verified=True
        )
        user.profile.restaurant = restaurant
        user.profile.save()
        return user, restaurant

    def test_create_table(self, api_client, restaurant_with_admin):
        """Test that a restaurant admin can create a table"""
        admin, restaurant = restaurant_with_admin
        api_client.force_authenticate(user=admin)
        
        response = api_client.post('/api/v1/tables/', {
            'name': '1',
            'capacity': 4,
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == '1'
        assert response.data['capacity'] == 4
        assert response.data['status'] == 'free'

    def test_list_tables(self, api_client, restaurant_with_admin):
        """Test that a restaurant admin can list their tables"""
        admin, restaurant = restaurant_with_admin
        
        # Create tables
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        Table.objects.create(restaurant=restaurant, number='2', seats=2)
        
        api_client.force_authenticate(user=admin)
        response = api_client.get('/api/v1/tables/')
        
        assert response.status_code == status.HTTP_200_OK
        # Response may be paginated or plain list
        if isinstance(response.data, list):
            results = response.data
        else:
            results = response.data.get('results', [])
        assert len(results) == 2

    def test_update_table(self, api_client, restaurant_with_admin):
        """Test that a restaurant admin can update a table"""
        admin, restaurant = restaurant_with_admin
        table = Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        api_client.force_authenticate(user=admin)
        response = api_client.patch(f'/api/v1/tables/{table.id}/', {
            'capacity': 6
        })
        assert response.status_code == status.HTTP_200_OK
        table.refresh_from_db()
        assert table.seats == 6


class TestReservationCreation:
    """Tests for reservation/booking creation"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_restaurant(self, db):
        admin = User.objects.create_user(
            username='booking_admin',
            email='bookingadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Booking Test Restaurant',
            address='123 Booking St',
            owner=admin,
            is_claimed=True,
            is_verified=True,
            capacity=20
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        Table.objects.create(restaurant=restaurant, number='2', seats=6)
        
        return admin, restaurant

    def test_create_booking(self, api_client, setup_restaurant, db):
        """Test that a customer can create a booking"""
        admin, restaurant = setup_restaurant
        
        customer = User.objects.create_user(
            username='booking_customer',
            email='customer@test.com',
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
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'pending'

    def test_create_booking_unverified_restaurant_fails(self, api_client, setup_restaurant, db):
        """Test that booking an unverified restaurant fails"""
        admin, restaurant = setup_restaurant
        restaurant.is_verified = False
        restaurant.save()
        
        customer = User.objects.create_user(
            username='customer2',
            email='customer2@test.com',
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
            'guests': 2
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestReservationConflictPrevention:
    """Tests for reservation conflict prevention"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_with_booking(self, db):
        admin = User.objects.create_user(
            username='conflict_admin',
            email='conflictadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Conflict Test Restaurant',
            address='123 Conflict St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        table = Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        # Create an existing booking
        booking_date = (date.today() + timedelta(days=2)).strftime('%Y-%m-%d')
        existing_booking = Booking.objects.create(
            restaurant=restaurant,
            table=table,
            date=booking_date,
            time=time(19, 0),
            guests=4,
            status=Booking.APPROVED,
            duration_minutes=120
        )
        
        return admin, restaurant, booking_date

    def test_double_booking_same_time_blocked(self, api_client, setup_with_booking, db):
        """Test that double booking at the same time is blocked"""
        admin, restaurant, booking_date = setup_with_booking
        
        customer = User.objects.create_user(
            username='double_book_customer',
            email='doublebook@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        # Try to book the same time
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': booking_date,
            'time': '19:00',  # Same time as existing booking
            'guests': 2,
            'duration_minutes': 90
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'столов' in str(response.data).lower() or 'available' in str(response.data).lower()

    def test_back_to_back_booking_allowed(self, api_client, setup_with_booking, db):
        """Test that back-to-back bookings (one ends when another starts) are allowed"""
        admin, restaurant, booking_date = setup_with_booking
        
        customer = User.objects.create_user(
            username='back_to_back_customer',
            email='backtoback@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        # Try to book immediately after existing booking ends (21:00 = 19:00 + 120 min)
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': booking_date,
            'time': '21:00',
            'guests': 2,
            'duration_minutes': 90
        })
        
        # This should succeed because existing booking ends at 21:00
        assert response.status_code == status.HTTP_201_CREATED


class TestReservationCancellation:
    """Tests for reservation cancellation"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_with_pending_booking(self, db):
        admin = User.objects.create_user(
            username='cancel_admin',
            email='canceladmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Cancel Test Restaurant',
            address='123 Cancel St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        table = Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        customer = User.objects.create_user(
            username='cancel_customer',
            email='cancelcustomer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        booking_date = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        booking = Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=booking_date,
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING
        )
        
        return admin, customer, restaurant, booking

    def test_customer_can_cancel_own_booking(self, api_client, setup_with_pending_booking):
        """Test that a customer can cancel their own booking"""
        admin, customer, restaurant, booking_date = setup_with_pending_booking
        
        # Get the booking
        booking = Booking.objects.filter(user=customer).first()
        
        api_client.force_authenticate(user=customer)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        
        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.CANCELLED_BY_USER

    def test_cannot_cancel_completed_booking(self, api_client, setup_with_pending_booking, db):
        """Test that a completed booking cannot be cancelled"""
        admin, customer, restaurant, booking_date = setup_with_pending_booking
        
        booking = Booking.objects.filter(user=customer).first()
        booking.status = Booking.COMPLETED
        booking.save()
        
        api_client.force_authenticate(user=customer)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/cancel/')
        
        # Should fail because transition is not allowed
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTableCapacityEnforcement:
    """Tests for table capacity enforcement"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_small_table(self, db):
        admin = User.objects.create_user(
            username='capacity_admin',
            email='capacityadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Capacity Test Restaurant',
            address='123 Capacity St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        # Small table that can only fit 2 people
        Table.objects.create(restaurant=restaurant, number='1', seats=2)
        
        return admin, restaurant

    def test_booking_exceeding_table_capacity_fails(self, api_client, setup_small_table, db):
        """Test that booking more guests than table capacity fails"""
        admin, restaurant = setup_small_table
        
        customer = User.objects.create_user(
            username='capacity_customer',
            email='capacitycustomer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        api_client.force_authenticate(user=customer)
        
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Try to book 4 guests for a 2-seat table
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 4,  # More than table capacity
            'duration_minutes': 90
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestDashboardViewing:
    """Tests for dashboard viewing"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_restaurant_with_bookings(self, db):
        admin = User.objects.create_user(
            username='dashboard_admin',
            email='dashboardadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Dashboard Test Restaurant',
            address='123 Dashboard St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        table = Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        # Create some bookings
        booking_date = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        customer = User.objects.create_user(
            username='dash_customer1',
            email='dashcustomer1@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=booking_date,
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING
        )
        
        return admin, restaurant

    def test_admin_can_view_restaurant_bookings(self, api_client, setup_restaurant_with_bookings):
        """Test that restaurant admin can view their restaurant's bookings"""
        admin, restaurant = setup_restaurant_with_bookings
        
        api_client.force_authenticate(user=admin)
        response = api_client.get('/api/v1/bookings/my_restaurant/')
        
        assert response.status_code == status.HTTP_200_OK
        if isinstance(response.data, list):
            results = response.data
        else:
            results = response.data.get('results', [])
        assert len(results) >= 1

    def test_customer_can_view_own_bookings(self, api_client, setup_restaurant_with_bookings, db):
        """Test that customer can view their own bookings"""
        admin, restaurant = setup_restaurant_with_bookings
        
        customer = User.objects.create_user(
            username='view_customer',
            email='viewcustomer@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()
        
        table = Table.objects.get(restaurant=restaurant)
        booking_date = (date.today() + timedelta(days=2)).strftime('%Y-%m-%d')
        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=booking_date,
            time=time(20, 0),
            guests=3,
            status=Booking.APPROVED
        )
        
        api_client.force_authenticate(user=customer)
        response = api_client.get('/api/v1/bookings/')
        
        assert response.status_code == status.HTTP_200_OK
        if isinstance(response.data, list):
            results = response.data
        else:
            results = response.data.get('results', [])
        # Should only see own bookings
        customer_ids = [b.get('user') or b.get('customer_id') for b in results]
        assert customer.id in customer_ids


class TestAvailableSlots:
    """Tests for available time slots"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_with_hours(self, db):
        admin = User.objects.create_user(
            username='slots_admin',
            email='slotsadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()
        
        restaurant = Restaurant.objects.create(
            name='Slots Test Restaurant',
            address='123 Slots St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()
        
        Table.objects.create(restaurant=restaurant, number='1', seats=4)
        
        # Add operating hours
        OpeningHours.objects.create(
            restaurant=restaurant,
            day_of_week=0,  # Monday
            opening_time=time(10, 0),
            closing_time=time(22, 0),
            is_closed=False
        )
        
        return admin, restaurant

    def test_get_available_slots(self, api_client, setup_with_hours):
        """Test getting available time slots"""
        admin, restaurant = setup_with_hours
        
        # Find a future Monday
        target_date = date.today()
        while target_date.weekday() != 0:  # Monday is 0
            target_date += timedelta(days=1)
        
        response = api_client.get('/api/v1/bookings/available_slots/', {
            'restaurant_id': restaurant.id,
            'date': target_date.strftime('%Y-%m-%d'),
            'guests': 2
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert 'slots' in response.data
        # Should have some available slots
        assert len(response.data['slots']) > 0
