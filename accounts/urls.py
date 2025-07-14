from django.urls import path
from . import views  # Fixed import error

app_name = 'accounts'

urlpatterns = [
    path('login/', views.custom_login, name='custom_login'),
    path('logout/', views.custom_logout, name='custom_logout'),
    path('profile/', views.user_profile, name='user_profile'),  # Fixed incorrect reference
    path('profile/edit/', views.edit_profile, name='edit_profile'),  # Fixed incorrect reference
    path('dashboard/', views.dashboard, name='dashboard'),
    path('register/', views.register, name='register'),
    path('verify_email/<str:uidb64>/<str:token>/', views.verify_email, name='verify_email'),
    path('forgot_password/', views.forgot_password, name='forgot_password'),
    path('reset_password/<str:uidb64>/<str:token>/', views.reset_password, name='reset_password'),
    path('claim-reward/', views.claim_daily_reward, name='claim_reward'),
    path('export/', views.export_filtered_data, name='export_filtered_data'),
]