import os
import django
import random
import datetime
from concurrent.futures import ThreadPoolExecutor

os.environ['TEST_ENV'] = 'true'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Profile
from restaurants.models import Restaurant, Table
from bookings.models import Booking
from bookings.services import BookingService

User = get_user_model()

def setup_data():
    print("Setting up 10 restaurants with tables...")
    restaurants = []
    
    for i in range(1, 11):
        username = f"qa_owner_{i}"
        user, _ = User.objects.get_or_create(username=username)
        user.set_password('testpass123')
        user.save()
        
        # Create profile
        Profile.objects.get_or_create(user=user, defaults={'role': 'owner'})
        
        # Create restaurant
        rest, created = Restaurant.objects.get_or_create(
            owner=user,
            defaults={
                'name': f"QA Restaurant {i}",
                'address': f"Test St {i}",
                'phone': f"12345{i}",
            }
        )
        
        # Set profile restaurant
        user.profile.restaurant = rest
        user.profile.save()
        
        # Create 10 tables for each
        if created or not Table.objects.filter(restaurant=rest).exists():
            for t in range(1, 11):
                Table.objects.create(
                    restaurant=rest,
                    number=f"T{t}",
                    seats=random.choice([2, 4, 6]),
                    x=t * 10,
                    y=t * 10,
                    width=40,
                    height=40,
                    table_type='rectangle'
                )
        restaurants.append(rest)
        
    return restaurants

def simulate_bookings_for_restaurant(restaurant):
    print(f"[{restaurant.name}] Starting simulation...")
    today = datetime.date.today()
    # 20 to 40 bookings
    num_bookings = random.randint(20, 40)
    
    # Pre-generate parameters
    requests = []
    for i in range(num_bookings):
        hour = random.randint(12, 22)
        minute = random.choice([0, 15, 30, 45])
        time_str = f"{hour:02d}:{minute:02d}"
        requests.append({
            'restaurant_id': restaurant.id,
            'name': f"Guest {i}",
            'email': f"guest{i}@example.com",
            'date': today,
            'time': time_str,
            'guests': random.choice([2, 3, 4, 5, 6])
        })
    
    successes = 0
    failures = 0
    
    # Send requests concurrently to test locks
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for req in requests:
            futures.append(executor.submit(make_booking, req))
            
        for future in futures:
            try:
                res = future.result()
                if res: successes += 1
                else: failures += 1
            except Exception as e:
                failures += 1
                
    print(f"[{restaurant.name}] Done. Success: {successes}, Fail (Capacity/Lock): {failures}")
    return successes

def make_booking(req):
    # Simulate API behavior: try to create
    try:
        from core.utils import get_user_restaurant
        # We simulate this at the service level, passing restaurant directly
        booking = Booking.objects.create(
            restaurant_id=req['restaurant_id'],
            user_name=req['name'],
            user_phone="12345678",
            date=req['date'],
            time=req['time'],
            guests=req['guests'],
            status='pending'
        )
        
        # Simulate approval -> confirming capacity -> seating
        auto_approve = True # Assuming auto-approve setting or manager action
        if auto_approve:
            # Parse time string to time object
            try:
                # "12:30" format
                time_obj = datetime.datetime.strptime(req['time'], '%H:%M').time()
            except ValueError:
                time_obj = datetime.time(12, 0)
                
            # Reassign table during approval
            tables = BookingService.find_best_tables(
                restaurant=booking.restaurant,
                date=req['date'],
                start_time=time_obj,
                guests=req['guests'],
                exclude_booking_id=booking.id
            )
            if not tables:
                print(f"Failed to find tables for {req['guests']} guests at {req['time']}")
                booking.status = 'rejected'
                booking.save()
                return False
                
            try:
                BookingService.acquire_booking_lock(
                    restaurant_id=booking.restaurant_id,
                    date=req['date'],
                    time_val=time_obj,
                    duration_minutes=120,
                )
            except Exception as le:
                print(f"Lock acquire error: {le}")
                return False
            booking.status = 'approved'
            booking.table = tables[0]  # Just setting first for simplicity in legacy field
            booking.save()
            booking.tables.set(tables)
            return True
            
    except Exception as e:
        # Expected if locked/rejected
        print(f"Exception during booking: {e}")
        return False
        
def run_simulation():
    restaurants = setup_data()
    print("--- Starting Concurrent Load Simulation ---")
    
    total_success = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for rest in restaurants:
            futures.append(executor.submit(simulate_bookings_for_restaurant, rest))
            
        for future in futures:
            total_success += future.result()
            
    print(f"Simulation completed. Total successful bookings today: {total_success}")
    
    print("Testing seating & cancel flows...")
    # Grab a few successful bookings and 'seat' them
    approved_bookings = Booking.objects.filter(status='approved')
    print(f"Found {approved_bookings.count()} approved bookings. Seating 5 randomly...")
    for b in approved_bookings.order_by('?')[:5]:
        b.status = 'seated'
        b.save()
        
    print("Canceling 5 randomly...")
    for b in approved_bookings.order_by('?')[:5]:
        b.status = 'cancelled'
        b.save()
        
    # Final count 
    print("Final Status Breakdown:")
    from django.db.models import Count
    for item in Booking.objects.values('status').annotate(total=Count('id')).order_by('status'):
        print(f" - {item['status']}: {item['total']}")
        
if __name__ == '__main__':
    run_simulation()
