from django.contrib import admin
from .models import EmailVerificationHistory


@admin.register(EmailVerificationHistory)
class EmailVerificationHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'email_count', 'valid_count', 'invalid_count', 'catchall_count', 'success_rate', 'created_at')
    list_filter = ('status', 'created_at', 'user')
    search_fields = ('user__username', 'title')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'status')
        }),
        ('Statistics', {
            'fields': ('email_count', 'valid_count', 'invalid_count', 'catchall_count', 'credits_used')
        }),
        ('Data', {
            'fields': ('verified_emails',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
