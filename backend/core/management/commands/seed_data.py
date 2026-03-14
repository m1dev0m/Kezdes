from django.core.management.base import BaseCommand
from venues.models import Venue, Amenity
from contractors.models import Contractor
import random
class Command(BaseCommand):
    help = 'Seed database with initial data'
    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')
        amenities_list = ['Парковка', 'Кондиционер', 'Сцена', 'Своя кухня', 'Проектор', 'Звуковое оборудование', 'Фотозона']
        amenity_objs = []
        for name in amenities_list:
            obj, _ = Amenity.objects.get_or_create(name=name)
            amenity_objs.append(obj)
        venue_names = ['hhal', 'Royal Tulip', 'Rixos Ballroom', 'Sky Lounge', 'Palace of Independence', 'The Ritz-Carlton', 'Marriott Hall', 'Hilton Garden']
        cities = ['Алматы', 'Астана', 'Шымкент', 'Актобе', 'Тараз', 'Павлодар']
        venue_images = [
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
            'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80',
            'https://images.unsplash.com/photo-1549488344-cbb6c34cf1ac?w=800&q=80',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
        ]
        for i, name in enumerate(venue_names):
            city = random.choice(cities)
            v = Venue.objects.create(
                name=f"{name} {city}",
                city=city,
                address=f"ул. Примерная {i+1}",
                min_capacity=random.randint(20, 100),
                max_capacity=random.randint(150, 500),
                price_budget=5000 + i * 500,
                price_medium=8000 + i * 800,
                price_premium=12000 + i * 1200,
                price_luxury=20000 + i * 2000,
                rating=random.uniform(4.0, 5.0),
                review_count=random.randint(10, 200),
                image_url=venue_images[i % len(venue_images)],
                description=f"Прекрасное место в центре города {city} для ваших мероприятий."
            )
            v.amenities.set(random.sample(amenity_objs, k=random.randint(2, 5)))
        contractor_categories = [
            ('photographer', 'Фотограф'),
            ('videographer', 'Видеограф'),
            ('host', 'Ведущий'),
            ('music', 'Музыка'),
            ('decorator', 'Декоратор'),
            ('catering', 'Кейтеринг'),
        ]
        contractor_images = {
            'photographer': 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&q=80',
            'videographer': 'https://images.unsplash.com/photo-1589903303941-0601007bbf51?w=400&q=80',
            'host': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
            'music': 'https://images.unsplash.com/photo-1514525253344-f81df030f66c?w=400&q=80',
            'decorator': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=80',
            'catering': 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80',
        }
        names = ['Арман', 'Берик', 'Сергей', 'Анна', 'Мария', 'Диас', 'Айгерим', 'Кайрат']
        for i in range(20):
            cat_code, cat_name = random.choice(contractor_categories)
            city = random.choice(cities)
            Contractor.objects.create(
                name=f"{random.choice(names)} {cat_name}",
                city=city,
                category=cat_code,
                price_from=random.randint(50000, 500000),
                rating=random.uniform(4.2, 5.0),
                review_count=random.randint(5, 100),
                image_url=contractor_images[cat_code],
                description="Профессионал своего дела с большим опытом работы на частных и корпоративных мероприятиях."
            )
        self.stdout.write(self.style.SUCCESS('Successfully seeded data'))
