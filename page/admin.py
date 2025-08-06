from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Page

@admin.register(Page)
class PageAdmin(ModelAdmin):
    list_display = ('title', 'slug', 'published', 'created_at', 'updated_at')
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ('title', 'content')
    list_filter = ('published', 'created_at')

    from ckeditor.widgets import CKEditorWidget
    from django import forms

    formfield_overrides = {
        Page._meta.get_field('content').__class__: {'widget': CKEditorWidget},
    }
