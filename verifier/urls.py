from . import views
from django.urls import path
app_name = 'verifier'
urlpatterns = [
    # ... other urls ...
    # path('verify-email/<int:result_id>/', views.verify_email, name='verifier'),
    #path('save-valid-emails/<int:result_id>/', views.save_valid_emails, name='save_valid_emails'),
    path('verify-emails/', views.verify_emails, name='verify_emails'),
    # path for email_verification_confirm should also be added
]
