#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.models import EmailVerificationHistory

print("=== Debug Email Verification Counts ===")

for history in EmailVerificationHistory.objects.all()[:5]:  # Show first 5
    print(f"\n--- History ID: {history.id} ---")
    print(f"Title: {history.title}")
    print(f"Current counts: Valid={history.valid_count}, Invalid={history.invalid_count}, Catch-all={history.catchall_count}")
    
    results = history.verified_emails.get('results', [])
    print(f"Total stored results: {len(results)}")
    
    # Analyze each result
    for i, result in enumerate(results[:3]):  # Show first 3 results
        print(f"\n  Result {i+1}:")
        print(f"    Email: {result.get('email', 'N/A')}")
        print(f"    Status: '{result.get('status', 'N/A')}'")
        print(f"    is_catch_all: {result.get('is_catch_all', 'N/A')}")
        print(f"    is_disposable: {result.get('is_disposable', 'N/A')}")
        print(f"    is_blacklisted: {result.get('is_blacklisted', 'N/A')}")
        print(f"    reason: {result.get('reason', 'N/A')}")
    
    # Manual count with new logic
    valid_count = 0
    invalid_count = 0 
    catchall_count = 0
    
    for result in results:
        is_catch_all = result.get('is_catch_all', False)
        status = result.get('status', 'invalid').lower()
        
        if is_catch_all:
            catchall_count += 1
        elif status == 'valid':
            valid_count += 1
        else:
            invalid_count += 1
    
    print(f"\n  Recalculated counts: Valid={valid_count}, Invalid={invalid_count}, Catch-all={catchall_count}")
    print(f"  Match database? {history.valid_count == valid_count and history.invalid_count == invalid_count and history.catchall_count == catchall_count}")

print("\n=== Debug Complete ===")
