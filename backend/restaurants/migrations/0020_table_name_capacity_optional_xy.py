from django.db import migrations, models


def backfill_table_name_capacity(apps, schema_editor):
    Table = apps.get_model("restaurants", "Table")
    for t in Table.objects.all().only("id", "number", "seats", "name", "capacity"):
        updates = {}
        if not getattr(t, "name", None):
            updates["name"] = t.number
        if getattr(t, "capacity", None) is None:
            updates["capacity"] = t.seats
        if updates:
            Table.objects.filter(id=t.id).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0019_restaurant_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="table",
            name="name",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="table",
            name="capacity",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="table",
            name="x",
            field=models.FloatField(blank=True, default=None, help_text="X position in floor plan", null=True),
        ),
        migrations.AlterField(
            model_name="table",
            name="y",
            field=models.FloatField(blank=True, default=None, help_text="Y position in floor plan", null=True),
        ),
        migrations.RunPython(backfill_table_name_capacity, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="table",
            name="name",
            field=models.CharField(editable=False, max_length=50),
        ),
        migrations.AlterField(
            model_name="table",
            name="capacity",
            field=models.PositiveIntegerField(editable=False),
        ),
    ]
