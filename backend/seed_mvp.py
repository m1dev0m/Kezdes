import os
import django
from decimal import Decimal
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from restaurants.models import Restaurant
def seed_data():
    restaurants = [
        {
            "name": "Sky Lounge Almaty",
            "address": "пр. Достык, 50, Алматы",
            "capacity": 100,
            "description": "Прекрасный вид на горы и город. Идеально для свадеб и корпоративов.",
            "average_price": 15000,
            "lat": 43.238949,
            "lng": 76.945403,
        },
        {
            "name": "Ozen Bistro",
            "address": "ул. Байсеитовой, 25, Алматы",
            "capacity": 45,
            "description": "Уютное место в центре города с отличной террасой.",
            "average_price": 8000,
            "lat": 43.245,
            "lng": 76.940,
        },
        {
            "name": "Zhetysu Hall",
            "address": "мкр. Самал-2, 58, Алматы",
            "capacity": 300,
            "description": "Роскошный банкетный зал для больших торжеств.",
            "average_price": 25000,
            "lat": 43.220,
            "lng": 76.950,
        },
        {
            "name": "Rumi Grill",
            "address": "ул. Гоголя, 10, Алматы",
            "capacity": 80,
            "description": "Восточная кухня и живая музыка.",
            "average_price": 12000,
            "lat": 43.260,
            "lng": 76.945,
        }
    ]
    for data in restaurants:
        Restaurant.objects.get_or_create(
            name=data['name'],
            defaults={
                'address': data['address'],
                'capacity': data['capacity'],
                'description': data['description'],
                'average_price': data['average_price'],
                'latitude': Decimal(str(data['lat'])),
                'longitude': Decimal(str(data['lng'])),
                'price_level': 2,
            }
        )
if __name__ == "__main__":
    seed_data()
