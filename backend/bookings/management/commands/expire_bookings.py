from django.core.management.base import BaseCommand
from bookings.models import Booking
class Command(BaseCommand):
    help = 'Expire stale pending bookings older than 30 minutes'
    def add_arguments(self, parser):
        parser.add_argument(
            '--ttl',
            type=int,
            default=30,
            help='Time-to-live in minutes for pending bookings (default: 30)'
        )
    def handle(self, *args, **options):
        ttl = options['ttl']
        count = Booking.expire_stale_bookings(ttl_minutes=ttl)
        if count:
            self.stdout.write(self.style.SUCCESS(
                f'✅ Expired {count} stale pending booking(s) (TTL: {ttl} min)'
            ))
        else:
            self.stdout.write(self.style.NOTICE(
                f'No stale bookings to expire (TTL: {ttl} min)'
            ))
