from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import User

class UserProfile(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('starter', 'Starter'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Contact Info
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=100, blank=True, null=True)
    
    # Subscription
    subscription_package = models.CharField(max_length=20, choices=PLAN_CHOICES)
    subscription_start = models.DateField(blank=True, null=True)
    subscription_end = models.DateField(blank=True, null=True)
    is_trial = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    verification_token = models.CharField(max_length=256, blank=True, null=True)
    
    # Usage Tracking
    email_credits = models.IntegerField(default=100)  # could reset monthly based on plan
    verify_credits = models.IntegerField(default=100)  # could reset monthly based on plan
    total_scrapes = models.IntegerField(default=0)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)

    # Preferences or Settings (optional)
    preferred_language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    last_reward_claim = models.DateField(blank=True, null=True)  # Track last reward claim date
    claimed_free_package = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s Profile"



