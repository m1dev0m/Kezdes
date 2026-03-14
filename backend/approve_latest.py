
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import RestaurantRequest
from restaurants.services import RestaurantService

req = RestaurantRequest.objects.filter(name="Test Venue 1773333153115").first()
if req:
    res, err = RestaurantService.approve_request(req.id)
    if err:
        print("Error:", err)
    else:
        print(f"Approved ID {req.id}")
else:
    print("Request not found")
