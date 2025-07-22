from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class EmailVerificationHistory(models.Model):
    """
    Model to store email verification history for users
    """
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_history')
    title = models.CharField(max_length=200, help_text="Title/description of the verification batch")
    email_count = models.PositiveIntegerField(default=0, help_text="Number of emails in this verification batch")
    verified_emails = models.JSONField(default=dict, help_text="JSON data containing all verified email results")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    credits_used = models.PositiveIntegerField(default=0, help_text="Number of credits used for this verification")
    
    # Summary statistics
    valid_count = models.PositiveIntegerField(default=0)
    invalid_count = models.PositiveIntegerField(default=0)
    catchall_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Email Verification History"
        verbose_name_plural = "Email Verification Histories"

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.email_count} emails)"

    @property
    def success_rate(self):
        """Calculate success rate as percentage (valid + catchall emails)"""
        if self.email_count == 0:
            return 0
        successful_count = self.valid_count + self.catchall_count
        return round((successful_count / self.email_count) * 100, 2)

    @property
    def formatted_date(self):
        """Return formatted date string"""
        return self.created_at.strftime("%B %d, %Y at %I:%M %p")
