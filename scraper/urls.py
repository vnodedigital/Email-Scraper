from django.urls import path
from .views import scrape_specific, scrape_multilevel_view, scrape_google_keyword, scrape_yellow_pages_view, scraper, save_result_view, delete_scraped_result

app_name= "scraper"
urlpatterns = [
    path("scraper/", scraper, name="scraper"),
    path("specific-url/", scrape_specific, name="scrape_specific"),
    path("multilevel-url/", scrape_multilevel_view, name="scrape_multilevel"),
    path("google-search/", scrape_google_keyword, name="scrape_google_keyword"),
    path('yellow-pages/', scrape_yellow_pages_view, name='scrape_yellow_pages'),
    path("save-result/", save_result_view, name="save_scraped_result"),
    path('delete/<int:pk>/', delete_scraped_result, name='delete_result'),
    
]