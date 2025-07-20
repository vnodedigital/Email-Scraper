from rest_framework import serializers
from .models import ScrapedFromGoogle
from django.contrib.auth.models import User

class ScrapingRequestSerializer(serializers.Serializer):
    """Base serializer for scraping requests"""
    user_credits = serializers.IntegerField(read_only=True)
    subscription_active = serializers.BooleanField(read_only=True)

class SpecificURLScrapingSerializer(ScrapingRequestSerializer):
    """Serializer for specific URL scraping"""
    url = serializers.URLField(required=True)

class MultiLevelScrapingSerializer(ScrapingRequestSerializer):
    """Serializer for multi-level scraping"""
    url = serializers.URLField(required=True)
    depth = serializers.IntegerField(default=2, min_value=1, max_value=5)

class GoogleScrapingSerializer(ScrapingRequestSerializer):
    """Serializer for Google search scraping"""
    keyword = serializers.CharField(max_length=255, required=True)
    country = serializers.CharField(max_length=10, required=True)
    result_limit = serializers.IntegerField(default=10, min_value=1, max_value=50)

class YellowPagesScrapingSerializer(ScrapingRequestSerializer):
    """Serializer for Yellow Pages scraping"""
    keyword = serializers.CharField(max_length=255, required=True)
    location = serializers.CharField(max_length=255, required=True)
    result_limit = serializers.IntegerField(default=5, min_value=1, max_value=20)

class ScrapingResultSerializer(serializers.Serializer):
    """Serializer for scraping results"""
    success = serializers.BooleanField()
    message = serializers.CharField(max_length=500, required=False)
    emails = serializers.ListField(child=serializers.EmailField(), required=False)
    urls = serializers.ListField(child=serializers.URLField(), required=False)
    companies = serializers.ListField(required=False)
    total_found = serializers.IntegerField(required=False)
    credits_used = serializers.IntegerField(required=False)
    remaining_credits = serializers.IntegerField(required=False)
    processing_time = serializers.FloatField(required=False)

class ScrapedDataSerializer(serializers.ModelSerializer):
    """Serializer for saved scraped data"""
    user = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = ScrapedFromGoogle
        fields = ['id', 'user', 'keyword', 'country', 'query', 'urls', 'emails', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
