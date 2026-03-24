import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import RestaurantRequest
from restaurants.services import RestaurantService

req = RestaurantRequest.objects.filter(name="Test Venue 1773333153115").first()
if req:
    _, err = RestaurantService.approve_request(req.id)
    if err:
        pass
    else:
        pass
else:
    pass
