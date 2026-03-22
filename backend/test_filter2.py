import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bookings.models import Booking
for b in Booking.objects.all():
    print("DB raw:", b.start_datetime, type(b.start_datetime))
    print("DB tzinfo:", getattr(b.start_datetime, 'tzinfo', None))
