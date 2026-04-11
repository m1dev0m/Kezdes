import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date, time
from bookings.models import Booking, STATUS_CHOICES

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestKezdesSmoke:
    
    def test_booking_lifecycle_happy_path(self, api_client, restaurant_factory, user_factory, table_factory):
        # Setup
        restaurant = restaurant_factory()
        owner = user_factory(role='owner', restaurant=restaurant)
        api_client.force_authenticate(user=owner)
        table = table_factory(restaurant=restaurant, seats=4, is_active=True)
        
        # 1. Create Pending
        payload = {
            "restaurant": restaurant.id,
            "user_name_manual": "Smoke Test Guest",
            "date": str(date.today()),
            "time": "19:00",
            "guests": 2
        }
        res = api_client.post('/api/v1/bookings/create_manual/', payload)
        assert res.status_code == 201
        booking_id = res.data['id']
        
        # 2. Confirm
        res = api_client.patch(f'/api/v1/bookings/{booking_id}/confirm/')
        assert res.status_code == 200
        assert res.data['status'] == 'confirmed'
        
        # 3. Seat
        res = api_client.post(f'/api/v1/bookings/{booking_id}/seat/', {'table_id': table.id})
        assert res.status_code == 200
        assert res.data['status'] == 'seated'
        
        # 4. Complete
        res = api_client.patch(f'/api/v1/bookings/{booking_id}/complete/')
        assert res.status_code == 200
        assert res.data['status'] == 'completed'

    def test_waitlist_conversion(self, api_client, restaurant_factory, user_factory, table_factory):
        from bookings.models import WaitlistEntry
        restaurant = restaurant_factory()
        owner = user_factory(role='owner', restaurant=restaurant)
        api_client.force_authenticate(user=owner)
        
        # 1. Add to waitlist
        res = api_client.post('/api/v1/bookings/waitlist/', {
            "restaurant": restaurant.id,
            "guest_name": "Walkin Guest",
            "party_size": 2,
            "contact_phone": "+77000000000"
        })
        assert res.status_code == 201
        waitlist_id = res.data['id']
        
        # 2. Convert to reservation
        res = api_client.post(f'/api/v1/bookings/waitlist/{waitlist_id}/convert-to-reservation/', {
            "time": "20:00"
        })
        assert res.status_code == 201
        assert res.data['status'] == 'confirmed'
        
        # Waitlist should be completed
        entry = WaitlistEntry.objects.get(id=waitlist_id)
        assert entry.status == 'completed'
        
    def test_cross_tenant_isolation(self, api_client, restaurant_factory, user_factory):
        rest_A = restaurant_factory(name="A")
        rest_B = restaurant_factory(name="B")
        
        owner_A = user_factory(role='owner', restaurant=rest_A)
        owner_B = user_factory(role='owner', restaurant=rest_B)
        
        # Create booking in A
        api_client.force_authenticate(user=owner_A)
        res = api_client.post('/api/v1/bookings/create_manual/', {
            "restaurant": rest_A.id,
            "user_name_manual": "Guest A",
            "date": str(date.today()),
            "time": "19:00",
            "guests": 2
        })
        booking_id_A = res.data['id']
        
        # B tries to read A's booking
        api_client.force_authenticate(user=owner_B)
        res_read = api_client.get(f'/api/v1/bookings/{booking_id_A}/')
        assert res_read.status_code == 404  # Tenant isolation should hide it
        
        # B tries to cancel A's booking
        res_cancel = api_client.patch(f'/api/v1/bookings/{booking_id_A}/reject/')
        assert res_cancel.status_code == 404
