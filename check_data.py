from django.contrib.auth.models import User
from scraper.models import ScrapedFromGoogle

print(f'Users: {User.objects.count()}')
print(f'Scraped data: {ScrapedFromGoogle.objects.count()}')

if ScrapedFromGoogle.objects.exists():
    print('Sample data:')
    for item in ScrapedFromGoogle.objects.all()[:3]:
        email_count = len(item.emails) if item.emails else 0
        print(f'- {item.keyword} ({item.country}) - {email_count} emails')
else:
    print('No scraped data found. You need to scrape some data first.')
