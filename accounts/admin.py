from django.contrib import admin
from .models import UserProfile
from unfold.admin import ModelAdmin
from django.contrib.auth.models import User

class UserProfileAdmin(ModelAdmin):
    list_display = ['user', 'scraper_package', 'verifier_package', 'email_credits', 'verify_credits', 'total_scrapes']
    search_fields = ['user__username', 'company_name']
    list_filter = ['scraper_package', 'verifier_package', 'status', 'is_trial']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'phone_number', 'company_name', 'status')
        }),
        ('Packages', {
            'fields': ('scraper_package', 'verifier_package', 'subscription_start', 'subscription_end', 'is_trial')
        }),
        ('Credits & Usage', {
            'fields': ('email_credits', 'verify_credits', 'total_scrapes')
        }),
        ('Settings', {
            'fields': ('preferred_language', 'timezone', 'verification_token'),
            'classes': ('collapse',)
        }),
    )

admin.site.register(UserProfile, UserProfileAdmin)
# Unregister the default User admin
admin.site.unregister(User)
admin.site.register(User, ModelAdmin)  # Register with the custom admin