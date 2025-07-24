from django.urls import path
from .views import package, subscription, verifier_package, verifier_subscription

app_name= "package"
urlpatterns = [
    path("pricing/", package, name="package"),
    path("subscription/<str:package>/", subscription, name="subscription"),
    path("verifier-pricing/", verifier_package, name="verifier_package"),
    path("verifier-subscription/<str:package>/", verifier_subscription, name="verifier_subscription"),
    
]