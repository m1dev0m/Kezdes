import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bookings.models import Booking
for b in Booking.objects.all():
    print(b.id, b.status, type(b.status))
