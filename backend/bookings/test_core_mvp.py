import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from restaurants.models import Restaurant, Table, Availability
from bookings.models import Booking
from datetime import date, time, timedelta

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    admin_user = User.objects.create_superuser('admin', 'admin@test.com', 'pass123')
    admin_user.profile.role = 'global_admin'
    admin_user.profile.save()

    owner_user = User.objects.create_user('owner', 'owner@test.com', 'pass123')
    owner_user.profile.role = 'restaurant_owner'
    owner_user.profile.save()

    restaurant = Restaurant.objects.create(
        name='Test Restaurant',
        address='Test Address',
        city='Almaty',
        owner=owner_user,
        is_verified=True,
        is_claimed=True
    )
    owner_user.profile.restaurant = restaurant
    owner_user.profile.save()

    t1 = Table.objects.create(restaurant=restaurant, number='1', seats=4)
    t2 = Table.objects.create(restaurant=restaurant, number='2', seats=2)

    return {
        'admin': admin_user,
        'owner': owner_user,
        'restaurant': restaurant,
        'tables': [t1, t2]
    }

@pytest.mark.django_db
def test_restaurant_onboarding_and_booking_flow(api_client, setup_data):
    owner = setup_data['owner']
    restaurant = setup_data['restaurant']
    api_client.force_authenticate(user=owner)

    total_capacity = sum(t.seats for t in setup_data['tables'])
    Availability.objects.create(restaurant=restaurant, date=date.today(), available_seats=total_capacity)

    avail = Availability.objects.get(restaurant=restaurant, date=date.today())
    assert avail.available_seats == 6

    booking_data = {
        'restaurant': restaurant.id,
        'date': str(date.today() + timedelta(days=1)),
        'time': '18:00:00',
        'guests': 2,
        'duration_minutes': 120
    }
    response = api_client.post('/api/v1/bookings/', booking_data, format='json')
    assert response.status_code == 201

    booking_data_oversized = {
        'restaurant': restaurant.id,
        'date': str(date.today() + timedelta(days=1)),
        'time': '19:00:00',
        'guests': 10,
        'duration_minutes': 120
    }
    response = api_client.post('/api/v1/bookings/', booking_data_oversized, format='json')
    assert response.status_code == 400
    error_msg = response.data['error']['message'].lower()
    assert 'доступных столов' in error_msg or 'активная бронь' in error_msg or 'вместимость' in error_msg or 'пересекающ' in error_msg or 'активн' in error_msg

@pytest.mark.django_db
def test_locking_mechanism(api_client, setup_data):
    from bookings.services import BookingService
    restaurant = setup_data['restaurant']
    test_date = date.today()
    test_time = time(20, 0)

    locked = BookingService.acquire_booking_lock(restaurant.id, test_date, test_time)
    assert locked is True

    locked_again = BookingService.acquire_booking_lock(restaurant.id, test_date, test_time)
    assert locked_again is False

    BookingService.release_booking_lock(restaurant.id, test_date, test_time)
    
    locked_third = BookingService.acquire_booking_lock(restaurant.id, test_date, test_time)
    assert locked_third is True
