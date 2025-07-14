from django.contrib import admin
from .models import UserProfile
from unfold.admin import ModelAdmin
from django.contrib.auth.models import User

class UserProfileAdmin(ModelAdmin):
    list_display = ['user', 'subscription_package', 'email_credits', 'total_scrapes']
    search_fields = ['user__username', 'company_name']

admin.site.register(UserProfile, UserProfileAdmin)
# Unregister the default User admin
admin.site.unregister(User)
admin.site.register(User, ModelAdmin)  # Register with the custom admin