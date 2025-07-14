from django.contrib import admin
from .models import ScrapedFromGoogle
from unfold.admin import ModelAdmin


admin.site.register(ScrapedFromGoogle, ModelAdmin)