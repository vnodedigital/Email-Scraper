#!/usr/bin/env python
import os
import sys
sys.path.append('/d/Email Verifier/sme_ai')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')

import django
django.setup()

from verifier.utils import smtp_check, is_catch_all, get_mx_records

# Test catch-all detection manually
test_domains = ['gmail.com', 'yahoo.com', 'example.com']

print("=== Testing Catch-All Detection ===")

for domain in test_domains:
    print(f"\nTesting domain: {domain}")
    
    # Get MX records
    mx_hosts = get_mx_records(domain)
    print(f"MX hosts: {mx_hosts}")
    
    if mx_hosts:
        # Test catch-all for first MX host
        mx_host = mx_hosts[0]
        try:
            catch_all_result = is_catch_all(mx_host, domain)
            print(f"Catch-all result for {mx_host}: {catch_all_result}")
        except Exception as e:
            print(f"Error testing catch-all: {str(e)}")
    
    # Test actual email verification
    test_email = f"randomtest12345@{domain}"
    print(f"Testing email: {test_email}")
    try:
        result = smtp_check(test_email)
        print("SMTP Check result:")
        print(f"  status: {result.get('status')}")
        print(f"  is_catch_all: {result.get('is_catch_all')}")
        print(f"  reason: {result.get('reason')}")
    except Exception as e:
        print(f"Error in smtp_check: {str(e)}")

print("\n=== Test Complete ===")
