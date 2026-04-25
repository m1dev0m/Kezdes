import os
import re

VIEWS_PATH = 'bookings/views.py'

with open(VIEWS_PATH, 'r') as f:
    lines = f.readlines()

def get_line_index(pattern, start=0):
    for i in range(start, len(lines)):
        if re.search(pattern, lines[i]):
            return i
    return -1

                     
imports_end = get_line_index(r'class BookingViewSet')
booking_vs_start = get_line_index(r'class BookingViewSet')
waitlist_vs_start = get_line_index(r'class WaitlistViewSet')

imports = lines[:booking_vs_start]

booking_vs_lines = lines[booking_vs_start:waitlist_vs_start]
waitlist_vs_lines = lines[waitlist_vs_start:]

                                                           
query_methods = [
    '_normalize_statuses', '_idempotency_cache_key', '_request_payload_hash', 
    '_parse_time_value', '_schedule_fields_changed', '_metadata_fields_from_payload', 
    '_history_prefetch', '_optimized_booking_queryset', '_apply_common_filters', 
    '_apply_response_pagination'
]

                                         
                                                   
with open('bookings/waitlist_views.py', 'w') as f:
    f.writelines(imports)
    f.writelines(waitlist_vs_lines)

                                              
with open(VIEWS_PATH, 'w') as f:
    f.writelines(lines[:waitlist_vs_start])
