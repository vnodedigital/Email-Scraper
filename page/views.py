from django.shortcuts import render
from .models import Page
# Add your views here
def page_view(request, slug):
    page = Page.objects.get(slug=slug)
    return render(request, 'page.html', {'page': page})

def page_list(request):
    pages = Page.objects.filter(published=True)
    return render(request, 'footer.html', {'pages': pages})