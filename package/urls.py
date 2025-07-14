from django.urls import path
from .views import package, subscription

app_name= "package"
urlpatterns = [
    path("pricing/", package, name="package"),
    path("subscription/<str:package>/", subscription, name="subscription"),
    
]