from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Profile


class Command(BaseCommand):
    help = "Create or repair a global admin user with superuser permissions."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="kiro")
        parser.add_argument("--password", default="kiro")
        parser.add_argument("--email", default="")

    def handle(self, *args, **options):
        username = options["username"].strip()
        password = options["password"]
        email = options["email"].strip()

        if not username:
            self.stderr.write(self.style.ERROR("Username is required."))
            return

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        updated_fields = []
        if email and user.email != email:
            user.email = email
            updated_fields.append("email")
        if not user.is_active:
            user.is_active = True
            updated_fields.append("is_active")
        if not user.is_staff:
            user.is_staff = True
            updated_fields.append("is_staff")
        if not user.is_superuser:
            user.is_superuser = True
            updated_fields.append("is_superuser")

        user.set_password(password)
        updated_fields.append("password")
        user.save(update_fields=updated_fields)

        profile, _ = Profile.objects.get_or_create(user=user)
        if profile.role != "global_admin":
            profile.role = "global_admin"
            profile.save(update_fields=["role"])

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} global admin '{username}' with superuser access."
            )
        )
