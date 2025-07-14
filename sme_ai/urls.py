from django.contrib import admin
from django.urls import path, include
from .views import home


#show media files
from django.conf import settings
from django.contrib.staticfiles.urls import static



urlpatterns = [
    path("admin/", admin.site.urls),
    path("", home, name="home"),
    path("scraper/", include("scraper.urls")),
    path("account/", include("accounts.urls")),
    path("package/", include("package.urls")),
    path("verifier/", include("verifier.urls")),
    path("__reload__/", include("django_browser_reload.urls")),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)