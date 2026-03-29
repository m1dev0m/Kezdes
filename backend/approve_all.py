import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import RestaurantRequest
from restaurants.services import RestaurantService

pending = RestaurantRequest.objects.filter(status='pending')
count = 0
for req in pending:
    _, err = RestaurantService.approve_request(req.id)
    if not err:
        count += 1
print(f"Approved {count} restaurants!")
