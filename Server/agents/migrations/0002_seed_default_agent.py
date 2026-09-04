from django.db import migrations


def create_default_agent(apps, schema_editor):
    Agent = apps.get_model("agents", "Agent")
    Agent.objects.get_or_create(
        slug="rastinax-marketing",
        defaults={
            "name": "Rastinax Marketing Agent",
            "description": "Default marketing and sales assistant for Rastinax.",
            "is_active": True,
        },
    )


def remove_default_agent(apps, schema_editor):
    Agent = apps.get_model("agents", "Agent")
    Agent.objects.filter(slug="rastinax-marketing").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("agents", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_default_agent,
            remove_default_agent,
        ),
    ]
