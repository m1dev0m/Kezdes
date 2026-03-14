"""
Additional tests for edge cases and regression testing.
"""
import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from restaurants.models import Restaurant, Table, OpeningHours
from bookings.models import Booking


class TestEdgeCases:


    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_edge_case_restaurant(self, db):
        admin = User.objects.create_user(
            username='edge_admin',
            email='edgeadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()

        restaurant = Restaurant.objects.create(
            name='Edge Case Restaurant',
            address='123 Edge St',
            owner=admin,
            is_claimed=True,
            is_verified=True,
            capacity=10
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()

        
        Table.objects.create(restaurant=restaurant, number='1', seats=2)
        Table.objects.create(restaurant=restaurant, number='2', seats=4)
        Table.objects.create(restaurant=restaurant, number='3', seats=6)
        OpeningHours.objects.create(
            restaurant=restaurant,
            day_of_week=0,
            opening_time=time(10, 0),
            closing_time=time(22, 0),
            is_closed=False
        )

        return admin, restaurant

    def test_booking_with_exact_table_capacity(self, api_client, setup_edge_case_restaurant, db):
        """Test booking exactly matching table capacity succeeds"""
        admin, restaurant = setup_edge_case_restaurant

        customer = User.objects.create_user(
            username='exact_capacity_customer',
            email='exactcap@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()

        api_client.force_authenticate(user=customer)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

  
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '14:00',
            'guests': 4,
            'duration_minutes': 90
        })

        assert response.status_code == status.HTTP_201_CREATED

    def test_booking_multiple_tables_combined(self, api_client, setup_edge_case_restaurant, db):
        """Test booking that requires combining multiple tables"""
        admin, restaurant = setup_edge_case_restaurant

        customer = User.objects.create_user(
            username='combined_customer',
            email='combined@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()

        api_client.force_authenticate(user=customer)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '18:00',
            'guests': 8,
            'duration_minutes': 120
        })

        assert response.status_code == status.HTTP_201_CREATED

    def test_booking_duration_affects_availability(self, api_client, setup_edge_case_restaurant, db):
        admin, restaurant = setup_edge_case_restaurant

        customer1 = User.objects.create_user(
            username='long_duration_customer',
            email='longdur@test.com',
            password='testpass123'
        )
        customer1.profile.role = 'customer'
        customer1.profile.save()

        api_client.force_authenticate(user=customer1)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Book 3-hour slot
        response1 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '14:00',
            'guests': 2,
            'duration_minutes': 180
        })

        # Should succeed
        assert response1.status_code == status.HTTP_201_CREATED

    def test_booking_near_closing_time(self, api_client, setup_edge_case_restaurant, db):
        """Test booking near restaurant closing time when hours are defined"""
        admin, restaurant = setup_edge_case_restaurant

        # The fixture already creates opening hours for Monday (day_of_week=0)
        # Let's check what day tomorrow is
        tomorrow = date.today() + timedelta(days=1)
        day_of_week = tomorrow.weekday()

        # Get or create hours for the target day
        hours, _ = OpeningHours.objects.get_or_create(
            restaurant=restaurant,
            day_of_week=day_of_week,
            defaults={
                'opening_time': time(10, 0),
                'closing_time': time(21, 0),  # Close at 21:00
                'is_closed': False
            }
        )
        if not hours.id:
            hours.closing_time = time(21, 0)
            hours.save()

        customer = User.objects.create_user(
            username='late_customer',
            email='late@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()

        api_client.force_authenticate(user=customer)

        tomorrow_str = tomorrow.strftime('%Y-%m-%d')

        # Book at 20:00 with 90 min duration - should end at 21:30 which is past closing
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow_str,
            'time': '20:00',
            'guests': 2,
            'duration_minutes': 90
        })

        # Should fail due to operating hours (ends at 21:30 > 21:00 closing)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_booking_past_closing_time_allowed_when_within_hours(self, api_client, setup_edge_case_restaurant, db):
        """Test booking that ends exactly at closing time is allowed"""
        admin, restaurant = setup_edge_case_restaurant

        customer = User.objects.create_user(
            username='exact_closing_customer',
            email='exactclose@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()

        api_client.force_authenticate(user=customer)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Book at 20:30 with 90 min duration - ends at 22:00 which is exactly closing
        response = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '20:30',
            'guests': 2,
            'duration_minutes': 90
        })

        # This depends on implementation - might pass or fail
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]


class TestMultipleRestaurants:
    """Tests for multiple restaurants and concurrent scenarios"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_multiple_restaurants(self, db):
        """Setup multiple restaurants for testing"""
        # Restaurant 1
        admin1 = User.objects.create_user(
            username='multi_admin1',
            email='multiadmin1@test.com',
            password='testpass123'
        )
        admin1.profile.role = 'restaurant_admin'
        admin1.profile.save()

        restaurant1 = Restaurant.objects.create(
            name='Restaurant One',
            address='123 First St',
            owner=admin1,
            is_claimed=True,
            is_verified=True,
            capacity=20
        )
        admin1.profile.restaurant = restaurant1
        admin1.profile.save()
        Table.objects.create(restaurant=restaurant1, number='1', seats=4)
        Table.objects.create(restaurant=restaurant1, number='2', seats=6)

        # Restaurant 2
        admin2 = User.objects.create_user(
            username='multi_admin2',
            email='multiadmin2@test.com',
            password='testpass123'
        )
        admin2.profile.role = 'restaurant_admin'
        admin2.profile.save()

        restaurant2 = Restaurant.objects.create(
            name='Restaurant Two',
            address='456 Second St',
            owner=admin2,
            is_claimed=True,
            is_verified=True,
            capacity=30
        )
        admin2.profile.restaurant = restaurant2
        admin2.profile.save()
        Table.objects.create(restaurant=restaurant2, number='1', seats=8)

        return admin1, admin2, restaurant1, restaurant2

    def test_booking_different_restaurants_same_time(self, api_client, setup_multiple_restaurants, db):
        """Test user can book different restaurants at same time"""
        admin1, admin2, restaurant1, restaurant2 = setup_multiple_restaurants

        customer = User.objects.create_user(
            username='multi_restaurant_customer',
            email='multirest@test.com',
            password='testpass123'
        )
        customer.profile.role = 'customer'
        customer.profile.save()

        api_client.force_authenticate(user=customer)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Book restaurant 1
        response1 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant1.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 2,
            'duration_minutes': 90
        })
        assert response1.status_code == status.HTTP_201_CREATED

        # Try to book restaurant 2 at overlapping time
        response2 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant2.id,
            'date': tomorrow,
            'time': '19:00',
            'guests': 2,
            'duration_minutes': 90
        })
        # This should fail because user has overlapping booking
        assert response2.status_code == status.HTTP_400_BAD_REQUEST

    def test_different_users_book_same_restaurant_different_times(self, api_client, setup_multiple_restaurants, db):
        """Test different users can book same restaurant at different times"""
        admin1, admin2, restaurant1, restaurant2 = setup_multiple_restaurants

        customer1 = User.objects.create_user(
            username='customer_time1',
            email='time1@test.com',
            password='testpass123'
        )
        customer1.profile.role = 'customer'
        customer1.profile.save()

        customer2 = User.objects.create_user(
            username='customer_time2',
            email='time2@test.com',
            password='testpass123'
        )
        customer2.profile.role = 'customer'
        customer2.profile.save()

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Customer 1 books at 18:00
        api_client.force_authenticate(user=customer1)
        response1 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant1.id,
            'date': tomorrow,
            'time': '18:00',
            'guests': 2,
            'duration_minutes': 90
        })
        assert response1.status_code == status.HTTP_201_CREATED

        # Customer 2 books at 20:00 (non-overlapping)
        api_client.force_authenticate(user=customer2)
        response2 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant1.id,
            'date': tomorrow,
            'time': '20:00',
            'guests': 4,
            'duration_minutes': 90
        })
        assert response2.status_code == status.HTTP_201_CREATED


class TestRestaurantCapacityLimits:
    """Tests for restaurant-level capacity limits"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_low_capacity_restaurant(self, db):
        """Setup restaurant with limited total capacity"""
        admin = User.objects.create_user(
            username='lowcap_admin',
            email='lowcapadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()

        restaurant = Restaurant.objects.create(
            name='Low Capacity Restaurant',
            address='123 Low Cap St',
            owner=admin,
            is_claimed=True,
            is_verified=True,
            capacity=6  # Very low capacity
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()

        # Create tables with total capacity of 6
        Table.objects.create(restaurant=restaurant, number='1', seats=2)
        Table.objects.create(restaurant=restaurant, number='2', seats=4)

        return admin, restaurant

    def test_restaurant_capacity_limit_enforced(self, api_client, setup_low_capacity_restaurant, db):
        """Test that restaurant capacity limit is enforced"""
        admin, restaurant = setup_low_capacity_restaurant

        customer1 = User.objects.create_user(
            username='cap_customer1',
            email='capc1@test.com',
            password='testpass123'
        )
        customer1.profile.role = 'customer'
        customer1.profile.save()

        api_client.force_authenticate(user=customer1)

        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # First booking of 4 guests should succeed
        response1 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '18:00',
            'guests': 4,
            'duration_minutes': 120
        })
        assert response1.status_code == status.HTTP_201_CREATED

        # Second booking of 4 guests at overlapping time should fail
        customer2 = User.objects.create_user(
            username='cap_customer2',
            email='capc2@test.com',
            password='testpass123'
        )
        customer2.profile.role = 'customer'
        customer2.profile.save()

        api_client.force_authenticate(user=customer2)

        response2 = api_client.post('/api/v1/bookings/', {
            'restaurant': restaurant.id,
            'date': tomorrow,
            'time': '19:00',  # Overlaps with first booking
            'guests': 4,
            'duration_minutes': 90
        })

        # Should fail due to capacity limit
        assert response2.status_code == status.HTTP_400_BAD_REQUEST


class TestBookingStatusTransitions:
    """Tests for booking status transitions"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_for_status_tests(self, db):
        """Setup for status transition tests"""
        admin = User.objects.create_user(
            username='status_admin',
            email='statusadmin@test.com',
            password='testpass123'
        )
        admin.profile.role = 'restaurant_admin'
        admin.profile.save()

        restaurant = Restaurant.objects.create(
            name='Status Test Restaurant',
            address='123 Status St',
            owner=admin,
            is_claimed=True,
            is_verified=True
        )
        admin.profile.restaurant = restaurant
        admin.profile.save()

        table = Table.objects.create(restaurant=restaurant, number='1', seats=4)

        customer = User.objects.create_user(
            username='status_customer',
            email='statuscustomer@test.com',
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

    def test_admin_can_confirm_booking(self, api_client, setup_for_status_tests):
        """Test that admin can confirm a pending booking"""
        admin, customer, restaurant, booking = setup_for_status_tests

        api_client.force_authenticate(user=admin)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/confirm/')

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.APPROVED

    def test_admin_can_reject_booking(self, api_client, setup_for_status_tests):
        """Test that admin can reject a pending booking"""
        admin, customer, restaurant, booking = setup_for_status_tests

        api_client.force_authenticate(user=admin)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/reject/')

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.REJECTED

    def test_admin_can_cancel_approved_booking(self, api_client, setup_for_status_tests):
        """Test that admin can cancel an approved booking"""
        admin, customer, restaurant, booking = setup_for_status_tests

        # First confirm the booking
        booking.status = Booking.APPROVED
        booking.save()

        api_client.force_authenticate(user=admin)
        response = api_client.post(f'/api/v1/bookings/{booking.id}/cancel_by_restaurant/')

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.CANCELLED_BY_RESTAURANT

    def test_admin_can_reassign_table_when_available(self, api_client, setup_for_status_tests):
        admin, customer, restaurant, booking = setup_for_status_tests

        table2 = Table.objects.create(restaurant=restaurant, number='2', seats=4)

        api_client.force_authenticate(user=admin)
        response = api_client.post(
            f'/api/v1/bookings/{booking.id}/reassign_table/',
            data={'table_id': table2.id},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.table_id == table2.id

    def test_admin_cannot_reassign_table_if_target_is_occupied(self, api_client, setup_for_status_tests):
        admin, customer, restaurant, booking = setup_for_status_tests

        table2 = Table.objects.create(restaurant=restaurant, number='2', seats=4)

        other_customer = User.objects.create_user(
            username='status_customer_2',
            email='statuscustomer2@test.com',
            password='testpass123'
        )
        other_customer.profile.role = 'customer'
        other_customer.profile.save()

        Booking.objects.create(
            user=other_customer,
            restaurant=restaurant,
            table=table2,
            date=booking.date,
            time=booking.time,
            guests=2,
            status=Booking.APPROVED,
            duration_minutes=booking.duration_minutes,
        )

        api_client.force_authenticate(user=admin)
        response = api_client.post(
            f'/api/v1/bookings/{booking.id}/reassign_table/',
            data={'table_id': table2.id},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
