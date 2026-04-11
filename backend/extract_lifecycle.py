import re

with open('bookings/views.py', 'r') as f:
    lines = f.readlines()

start_idx = 793 # Line 794 is 0-indexed 793
end_idx = 1017  # Line 1018 is 0-indexed 1017, meaning it stops before @action of available_slots

lifecycle_lines = lines[start_idx:end_idx]

with open('bookings/mixins/lifecycle_mixins.py', 'w') as f:
    f.write("from rest_framework.decorators import action\n")
    f.write("from rest_framework.response import Response\n")
    f.write("from rest_framework import status\n")
    f.write("from django.db import transaction\n")
    f.write("from django.utils import timezone\n")
    f.write("from django.core.exceptions import ValidationError\n")
    f.write("from core.responses import api_error\n")
    f.write("from core.permissions import CanManageReservations\n")
    f.write("from ..models import Booking\n")
    f.write("from ..engine import StatusMachine\n")
    f.write("from ..services import BookingService\n")
    f.write("from restaurants.models import Table\n")
    f.write("from core.utils import get_user_profile\n")
    f.write("\n")
    f.write("class BookingLifecycleMixin:\n")
    
    for l in lifecycle_lines:
        f.write(l)

new_views_lines = lines[:start_idx] + lines[end_idx:]

with open('bookings/views.py', 'w') as f:
    f.writelines(new_views_lines)

print("Done extracting lifecycle mixin")
