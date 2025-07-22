#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.utils import smtp_check

# Test with a real email to see the data structure
print("=== Testing smtp_check function ===")

test_emails = [
    'test@example.com',  # Known invalid domain
    'info@gmail.com',    # Known valid domain but may be role-based
    'nonexistent@gmail.com'  # Valid domain, invalid email
]

for email in test_emails:
    print(f"\nTesting: {email}")
    try:
        result = smtp_check(email)
        print("Result:")
        for key, value in result.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"Error: {str(e)}")

print("\n=== Test Complete ===")
