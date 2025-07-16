from . import views
from django.urls import path

app_name = 'verifier'

urlpatterns = [
    # Web routes
    path('verify-emails/', views.verify_emails, name='verify_emails'),
    path('api-example/', views.api_example, name='api_example'),
    
    # API routes
    path('api/', views.api_root, name='api_root'),
    path('api/check-email/', views.check_email_api, name='check_email_api'),
    path('api/health/', views.health_check, name='health_check'),
]
