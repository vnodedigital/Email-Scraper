from django.urls import path
from . import api_views

urlpatterns = [
    # API endpoints for scraping
    path('api/scrape/specific-url/', api_views.scrape_specific_url_api, name='scrape_specific_url_api'),
    path('api/scrape/multilevel/', api_views.scrape_multilevel_api, name='scrape_multilevel_api'),
    path('api/scrape/google/', api_views.scrape_google_api, name='scrape_google_api'),
    
    # Progress tracking
    path('api/progress/<str:task_id>/', api_views.scraping_progress_api, name='scraping_progress_api'),
    
    # Data management
    path('api/scraped-data/', api_views.user_scraped_data_api, name='user_scraped_data_api'),
    path('api/scraped-data/<int:pk>/delete/', api_views.delete_scraped_data_api, name='delete_scraped_data_api'),
]
