from . import views
from django.urls import path

app_name = 'verifier'

urlpatterns = [
    # Web routes
    path('verify-emails/', views.verify_emails, name='verify_emails'),
    path('api-example/', views.api_example, name='api_example'),
    
    # History management routes
    path('history/', views.get_verification_history, name='verification_history'),
    path('history/<int:history_id>/', views.get_verification_details, name='verification_details'),
    path('history/<int:history_id>/export/', views.export_verification_history, name='export_verification_history'),
    path('history/<int:history_id>/delete/', views.delete_verification_history, name='delete_verification_history'),
    path('history/clear-all/', views.clear_all_history, name='clear_all_history'),
    
    # API routes
    path('api/', views.api_root, name='api_root'),
    path('api/check-email/', views.check_email_api, name='check_email_api'),
    path('api/batch-verify/', views.batch_verify_emails, name='batch_verify_emails'),
    path('api/check-credits/', views.check_credits, name='check_credits'),
    path('api/usage-statistics/', views.usage_statistics, name='usage_statistics'),
    path('api/health/', views.health_check, name='health_check'),
    path('api/auth-status/', views.auth_status, name='auth_status'),
]
