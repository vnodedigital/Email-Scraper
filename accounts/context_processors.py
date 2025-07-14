from django.utils.timezone import now

def today_context(request):
    return {
        'today': now().date()
    }