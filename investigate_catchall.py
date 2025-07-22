import os
import sys
import json

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from verifier.models import EmailVerificationHistory

print("=== Investigating Catch-All Counting Issue ===\n")

histories = EmailVerificationHistory.objects.all()
print(f"Total verification histories: {histories.count()}")

for history in histories:
    print(f"\n--- History ID: {history.id} ---")
    print(f"Title: {history.title}")
    print(f"Email Count: {history.email_count}")
    print(f"Database Counts: Valid={history.valid_count}, Invalid={history.invalid_count}, Catch-all={history.catchall_count}")
    
    # Get results from JSON
    results = history.verified_emails.get('results', [])
    print(f"Stored results count: {len(results)}")
    
    # Analyze each result
    actual_valid = 0
    actual_invalid = 0
    actual_catchall = 0
    
    for i, result in enumerate(results):
        email = result.get('email', 'Unknown')
        status = result.get('status', 'unknown')
        is_catch_all = result.get('is_catch_all', None)
        
        print(f"\nResult {i+1}: {email}")
        print(f"  status: '{status}'")
        print(f"  is_catch_all: {is_catch_all}")
        print(f"  All keys: {list(result.keys())}")
        
        # Apply the new counting logic
        if is_catch_all is True or status == 'catch-all':
            actual_catchall += 1
            print(f"  -> Should count as CATCH-ALL")
        elif status == 'valid':
            actual_valid += 1
            print(f"  -> Should count as VALID")
        else:
            actual_invalid += 1
            print(f"  -> Should count as INVALID")
    
    print(f"\nActual counts should be:")
    print(f"  Valid: {actual_valid}")
    print(f"  Invalid: {actual_invalid}")  
    print(f"  Catch-all: {actual_catchall}")
    
    print(f"Database vs Actual match: {history.valid_count == actual_valid and history.invalid_count == actual_invalid and history.catchall_count == actual_catchall}")

print("\n=== Investigation Complete ===")
