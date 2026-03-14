from django.core.management.base import BaseCommand
from restaurants.services import TwoGISService
class Command(BaseCommand):
    help = 'Import restaurants from 2GIS for Astana'
    def handle(self, *args, **options):
        self.stdout.write('Starting restaurant import from 2GIS...')
        try:
            count = TwoGISService.import_restaurants()
            self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} restaurants'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Import failed: {str(e)}'))
