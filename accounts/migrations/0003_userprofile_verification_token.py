# Generated by Django 5.1.7 on 2025-04-20 09:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_userprofile_status_alter_userprofile_email_credits'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='verification_token',
            field=models.CharField(blank=True, max_length=256, null=True),
        ),
    ]
