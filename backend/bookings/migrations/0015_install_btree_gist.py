from django.db import migrations
from django.contrib.postgres.operations import BtreeGistExtension


def apply_btree_gist(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0014_booking_bookings_bo_restaur_9ca38e_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(apply_btree_gist, migrations.RunPython.noop),
    ]
