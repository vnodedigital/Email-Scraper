from django.urls import path
from .views import (
    package, scraper_subscription, verifier_package, verifier_subscription,
    subscription_status_api, cancel_subscription, upgrade_subscription
)

app_name= "package"
urlpatterns = [
    path("pricing/", package, name="package"),
    path("subscription/<str:package>/", scraper_subscription, name="subscription"),
    path("verifier-pricing/", verifier_package, name="verifier_package"),
    path("verifier-subscription/<str:package>/", verifier_subscription, name="verifier_subscription"),
    
    # API and management endpoints
    path("api/subscription-status/", subscription_status_api, name="subscription_status_api"),
    path("cancel/<str:service_type>/", cancel_subscription, name="cancel_subscription"),
    path("upgrade/<str:service_type>/<str:new_package>/", upgrade_subscription, name="upgrade_subscription"),
]