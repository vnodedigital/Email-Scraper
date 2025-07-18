# Generated by Django 5.1.7 on 2025-04-20 08:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approve', 'Approved'), ('reject', 'Rejected')], default='pending', max_length=20),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='email_credits',
            field=models.IntegerField(default=50),
        ),
    ]
