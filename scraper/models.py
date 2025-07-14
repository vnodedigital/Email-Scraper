from django.db import models
from django.contrib.auth.models import User

class ScrapedFromGoogle(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scraped_results")
    keyword = models.CharField(max_length=255)
    country = models.CharField(max_length=100, blank=True, null=True)
    query = models.CharField(max_length=255)
    urls = models.JSONField(blank=True, null=True)  # Stores list of URLs
    emails = models.JSONField(blank=True, null=True)  # Stores list of emails
    scraped_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} -{self.keyword} - {self.country} - {self.scraped_at.strftime('%Y-%m-%d %H:%M')}"
