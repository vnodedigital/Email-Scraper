import json
import sys
import os

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
import django
django.setup()

from verifier.models import EmailVerificationHistory

print("=== Checking existing email data ===")

for history in EmailVerificationHistory.objects.all():
    print(f"\nHistory ID {history.id}: {history.title}")
    results = history.verified_emails.get('results', [])
    
    print(f"Current counts: Valid={history.valid_count}, Invalid={history.invalid_count}, Catch-all={history.catchall_count}")
    
    # Show the actual email domains
    domains = set()
    for result in results:
        email = result.get('email', '')
        if '@' in email:
            domain = email.split('@')[1]
            domains.add(domain)
    
    print(f"Domains in this verification: {', '.join(sorted(domains))}")
    
    # Check if any results have catch-all indicators
    has_catchall_status = any(result.get('status') == 'catch-all' for result in results)
    has_catchall_flag = any(result.get('is_catch_all') == True for result in results)
    
    print(f"Has status='catch-all': {has_catchall_status}")
    print(f"Has is_catch_all=True: {has_catchall_flag}")
    
    # Show first result details
    if results:
        first_result = results[0]
        print(f"Sample result for {first_result.get('email', 'N/A')}:")
        for key in ['status', 'is_catch_all', 'reason']:
            print(f"  {key}: {first_result.get(key, 'N/A')}")

print("\n=== Analysis Complete ===")
